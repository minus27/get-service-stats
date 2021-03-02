function selectWafServices() { /* OK */
  if ($('#service-data tbody tr').length == 0) {
    bootstrapAlert('Select WAF Services Error','There is no data to select');
    return;
  }
  if ($( '#service-data td.waf' ).length == 0) {
    bootstrapAlert('Select WAF Services Error','There are no services with WAFs');
    return;
  }
  $( '.select-service' ).prop('checked',false);
  $( '#service-data tbody td[has-waf=true] input[type=checkbox]' ).prop('checked',true);
  serviceData.forEach(datum => datum.selected = datum.waf);
  updateTables();
}

function getHelp() { /* Not Yet Implemented*/
  bootstrapAlert('',$('#help-content').html(),true);
}

function exportData() {
  if ($('#service-data tbody tr').length == 0) {
    bootstrapAlert('Export Data Error','There is no data to export');
    return;
  }
  if ($('#service-data tbody tr td input:checked').length == 0) {
    bootstrapAlert('Export Data Error','There are no services selected');
    return;
  }
  $('#hiddenDownloadLink').attr("href", makeTextFile( getCsvDataNew() ));
  $('#hiddenDownloadLink')[0].click();
}

function changeDataFormat(dataType) {
  apiData[`${dataType}_format`] = $(`#${dataType}Format`).val();
  $(document.body).attr(`${dataType}-format`,apiData[`${dataType}_format`]);
  ["abbreviated","comma-separated","integer"].forEach(function(bytesFormat) {
    if (bytesFormat == apiData.bytes_format) {
      $(`.${dataType}.${bytesFormat}`).attr('csv','');
    } else {
      $(`.${dataType}.${bytesFormat}`).removeAttr('csv');
    }
  });
}

function updateAverageDivisor() {
  apiData.average_divisor = parseInt($('#averageDivisor').val());
  $('body').attr('average',(apiData.average_divisor != '1') ? 'true' : 'false');
  updateTables();
}

function updateShieldingMultiplier() {
  apiData.shielding_multiplier = parseFloat($('#shieldingMultiplier').val());
  updateTables();
}

function checkDates(e) { /* OK */
  if (elapsedDays() < 1) {
    bootstrapAlert('Bad date',`The "From Date" must come before the "To Date"`);
    setTimeout(function(e) { $(e).datepicker("setDate", newDate($(e).attr('previous-value'), true)); }, 1, e);
  } else {
    $(e).attr("previous-value",$(e).val());
  }
  $('#elapsedDays').val(elapsedDays());
}

function changeInputIdType() { /* OK */
  let selectedValue = $('#idType').val();
  if ('user_role' in apiData) {
    if (apiData.user_role == "billing" && selectedValue != "service") {
      bootstrapAlert('Insuffient Privileges','The supplied API Key has a "billing" User Role which cannot be used with the "Customer ID" Input ID Type');
      $('#idType').val('service')
      return
    }
  }
  ["service","customer"].forEach(function(idType) {
    let bMatch = idType==selectedValue, selector = `#${idType}Id`;
    $(selector).prop('readonly',!bMatch);
    if (bMatch) {
      $(selector).attr('name','username')
      $(selector).addClass(`required-input`);
      $(selector).change(function() { checkInputs(this); }).keyup(function() { checkInputs(this); });
      $(selector).parent().parent().removeClass(`pseudo-readonly`);
    } else {
      $(selector).removeAttr('name')
      $(selector).removeClass(`required-input`);
      $(selector).off("change").off("keyup");
      $(selector).parent().parent().addClass(`pseudo-readonly`);
    }
  });
  checkInputs(document.querySelector('#idType'));
}

function initializeAverageDivisor() { /* OK */
  const selector = '#averageDivisor';
  const oninput_function = function() {
    (validity.valid && value!='') || (value=this.getAttribute('last-value'));
    this.setAttribute('last-value',value);
  };
  // Convert function to a string, extract its code, and then assign it to the "oninput" attribute
  $(selector).attr("oninput",oninput_function.toString().replace(/^[^{]+{\s*([\s\S]+?)\s*}$/,"$1"));
  $(selector).attr('last-value',$(selector).val());
}

function initialize() {
  
  // Finish page...
  
  createDataTables();
  
  // Set Dev Override if necessary
  
  let bDevMode = document.cookie.split(';').some((item) => item.includes('backend=F_content'));
  if (location.hostname == 'get-service-stats.global.ssl.fastly.net') {
    $( '.obscure' ).removeClass('obscure');
    $( '.not-obscured' ).addClass('obscure');
    $( '#banner-content-obscure' ).attr('id','banner-content');
    if ( bDevMode ) {
      console.log('DEV MODE');
      //$( 'nav.bg-dark' ).removeClass('bg-dark').addClass('bg-danger');
      $( '.user-inputs .form-group > label').addClass('dev-override-background-color');
      $( 'nav.bg-dark' ).addClass('dev-override-color');
      $( 'thead.thead-darkish' ).addClass('dev-override-color');
      $( 'nav.dev-override-color a span' ).text( `${$( 'nav.dev-override-color a span' ).text()} (DEV MODE)`);
    }
  }
  
  // Fields...
  
  $( '#idType' ).change(function() { changeInputIdType(); }).change();
  $( "#fromDate" )
    .datepicker({ format: 'yyyy-mm-dd', endDate: daysFromNow(0), autoclose: true, })
    .datepicker( "setDate", daysFromNow(-30)).attr("previous-value",$( "#fromDate" ).val());
  $( "#toDate" )
    .datepicker({ format: 'yyyy-mm-dd', endDate: daysFromNow(0), autoclose: true, })
    .datepicker( "setDate", daysFromNow(-1)).attr("previous-value",$( "#toDate" ).val());
  $( '.date-picker' ).change(function() { checkDates(this); });
  $( '#elapsedDays' ).val(elapsedDays());
  $( '#averageDivisor' ).change(function(){ updateAverageDivisor(); }).change();
  initializeAverageDivisor();
  $( '#bytesFormat' ).change(function() { changeDataFormat('bytes'); }).change();
  $( '#requestsFormat' ).change(function() { changeDataFormat('requests'); }).change();
  $( '#shieldingMultiplier' ).change(function() { updateShieldingMultiplier(); });
  $( '#export-footer' ).change(function(){apiData.export_footer=$(this).prop('checked');}).change();
  $( '.required-input' ).change(function() { checkInputs(this); }).keyup(function() { checkInputs(this); });
  $( '.select-service' ).click(function() { updateSelectedServices(this); });
  
  // Buttons...
  
  $( '#get-data' ).click(function() { stateTransition(0); });
  $( '#halt-get-data' ).click(function() { $('#kill-switch').prop("checked",true); });
  $( '#export-data' ).click(function() { exportData(); });
  $( '#select-waf-services' ).click(function() { selectWafServices(); });
  $( '#clear-data' ).click(function() { clearData(); });
  $( '#reload-page' ).click(function() { location.reload(); });
  
  // Final initialization...
  
  clearData();
  $( '.results.hidden' ).removeClass( 'hidden' );
  if (!bDevMode) bootstrapAlert('',$('#banner-content').html())
}