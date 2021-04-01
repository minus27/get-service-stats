function loadSampleExportData() {
  const sampleData = [
    '"Customer ID:","Jv4-PsmA6LyB2pc7V_a8Hs"',
    '"Customer Name:","My Customer Account"',
    '"Services Selected:",1',
    '"Total Requests:",20518',
    '"Avg Total Requests:",10259',
    '"Delivered BW:",81165079',
    '"Avg Delivered BW:",40582540',
    '"Hits:",0',
    '"Avg Hits:",0',
    '"Misses:",0',
    '"Avg Misses:",0',
    '"Passes:",7634',
    '"Avg Passes:",3817',
    '"Origin Requests:",7634',
    '"Avg Origin Requests:",3817',
    '"Origin Request BW:",6368664',
    '"Avg Origin Request BW:",3184332',
    '"Origin Response BW:",38528603',
    '"Avg Origin Response BW:",19264302',
    '"Origin RPS:",0.002945216049382716',
    '"Backend Request BW:",3184332',
    '"Avg Backend Request BW:",1592166',
    '"Edge Compute Requests:",0',
    '"Avg Edge Compute Requests:",0',
    '"Edge Compute Request Time:",0',
    '"Avg Edge Compute Request Time:",0',
    '"IO Responses:",0',
    '"Avg IO Responses:",0',
    '"IO Response BW:",0',
    '"Avg IO Response BW:",0',
    '"Video Responses:",0',
    '"Avg Video Responses:",0',
    '"OTFP Responses:",0',
    '"Avg OTFP Responses:",0',
    '"Shielding Count:",0',
    '"Fastly WAF Count:",1',
    '"C@E Count:",0',
    '"Date Range:","2021-03-28 - 2021-02-27"',
    '"Days of Data:",30',
  ];
  $('#modal-help-faq-export-data pre code').text(sampleData.join('\n'));
}

function quickSelectServices(e) { /* OK */
  if ($('#service-data tbody tr').length == 0) {
    bootstrapAlert('No Data','There is no data to quick select');
    return;
  }
  let selectBy = $(e).attr('select-by');
  //console.log(`Quick Select by ${selectBy}`);
  if (serviceData.filter(datum => (typeof datum[selectBy] == "boolean") ? datum[selectBy] : (datum[selectBy] > 0)).length == 0) {
    bootstrapAlert('No Matching Services',`No ${appCfg.getFieldForName('title',selectBy)} services found to quick select`);
    return;
  }
  $( '#service-data tbody input[type=checkbox]' ).prop('checked', false);
  $( `#service-data tbody td.${selectBy}.yes` ).parent().find( 'input[type=checkbox]' ).prop('checked', true);
  serviceData.forEach(datum => datum.selected = (typeof datum[selectBy] == "boolean") ? datum[selectBy] : (datum[selectBy] > 0));
  updateTables(false);
  sortTableData('service-select','asc');
}

function exportData() {
  if ($('#service-data tbody tr').length == 0) {
    bootstrapAlert('No Data','There is no data to export');
    return;
  }
  if ($('#service-data tbody tr td input:checked').length == 0) {
    bootstrapAlert('No Services Selected','There are no services selected');
    return;
  }
  $('#hiddenDownloadLink').attr("href", makeTextFile( getCsvData() ));
  $('#hiddenDownloadLink')[0].click();
}

function updateAverageDivisor() {
  apiData.average_divisor = parseInt($('#average_divisor').val());
  $('body').attr('average',(apiData.average_divisor != '1') ? 'true' : 'false');
  updateTables(true);
}

function updateShieldingMultiplier() {
  apiData.shielding_multiplier = parseFloat($('#shielding_multiplier').val());
  updateTables(true);
}

function checkDates(e) { /* OK */
  if (elapsedDays() < 1) {
    bootstrapAlert('Bad Date',`The "From Date" must come before the "To Date"`);
    setTimeout(function(e) { $(e).datepicker("setDate", newDate($(e).attr('previous-value'), true)); }, 1, e);
  } else {
    $(e).attr("previous-value",$(e).val());
  }
  $('#elapsedDays').val(elapsedDays());
}

function changeInputIdType(e) { /* OK */
  let selectedValue = $(e).attr('id').replace(/_id$/,'');
  $('#idType').val(selectedValue);
  apiData.id_type = selectedValue;
  if ('user_role' in apiData) {
    if (apiData.user_role == "billing" && selectedValue != "service") {
      bootstrapAlert('Insuffient Privileges','The supplied API Key has a "billing" User Role which cannot be used with the "Customer ID" Input ID Type');
      $('#idType').val('service')
      return
    }
  }
  ["service","customer"].forEach(function(idType) {
    let bMatch = idType==selectedValue, selector = `#${idType}_id`, colJquery = $(selector);
    colJquery.prop('readonly',!bMatch);
    let promptMsg = colJquery.attr('prompt'), currentVal = colJquery.val();
    if (bMatch) {
      colJquery
        .val((currentVal == promptMsg) ? '' : currentVal)
        .attr('name','username').addClass(`required-input`)
        .change(function() { checkInputs(this); }).keyup(function() { checkInputs(this); })
        .parent().parent().removeClass(`pseudo-readonly`);
    } else {
      colJquery
        .val((currentVal == '') ? promptMsg : currentVal)
        .removeAttr('name').removeClass(`required-input`).off("change").off("keyup")
        .parent().parent().addClass(`pseudo-readonly`);
    }
  });
  checkInputs(document.querySelector('#idType'));
  //setTimeout(function(){$(e).click()},3000)
}

function initializeAverageDivisor() { /* OK */
  const selector = '#average_divisor';
  const oninput_function = function() {
    (validity.valid && value!='') || (value=this.getAttribute('last-value'));
    this.setAttribute('last-value',value);
  };
  // Convert function to a string, extract its code, and then assign it to the "oninput" attribute
  $(selector).attr("oninput",oninput_function.toString().replace(/^[^{]+{\s*([\s\S]+?)\s*}$/,"$1"));
  $(selector).attr('last-value',$(selector).val());
}

function createStatsDataSourceTable() {
  const statUrl = 'https://developer.fastly.com/reference/api/metrics-stats/historical-stats/';
  appCfg.data.filter(datum => 'stats' in datum).forEach(datum => {
    $('#modal-help-faq-data-fields table tbody')
      .append($('<tr>')).find('tr:last-of-type')
        .append($('<td>',{text:`${('average' in datum && datum.average)?'[Avg] ':''}${datum.title}`}))
        .append($('<td>',{class:`sdf-${datum.name}`}));
    datum.stats.split(',').forEach((stat,index) => {
      $('#modal-help-faq-data-fields table tbody tr:last-of-type td:last-of-type')
        .append(document.createTextNode((index==0)?'':' + '))
        .append($('<a>',{target:'_blank', href:`${statUrl}#field_${stat}`,text:stat}))
    });
  });
  // HACK START
  $('.sdf-origin-rps').append(document.createTextNode(' / Days_of_Data / 24 / 60 / 60'));
  // HACK END
}

function createOtherDataSourceTable() {
  appCfg.data.filter(datum => 'source' in datum).forEach(datum => {
    $('#modal-help-faq-other-fields table tbody')
      .append($('<tr>')).find('tr:last-of-type')
        .append($('<td>',{text:datum.title}))
        .append($('<td>',{html:datum.source}));
  });
}

function selectCategories(e) {
  //console.log($(e).prop('checked'))
  let tagName = $(e).parent().prop('tagName'), colJquery, selector = '#modal-settings-displayed-fields td input[type=checkbox]';
  switch(tagName) {
    case 'TH':
      colJquery = $(selector);
      break;
    case 'TD':
      colJquery = $(`${selector}[value=${$(e).prop('value')}]`);
      break;
    default:
      throw new Error(`Unknown Tag Name (${tagName})`);
  }
  //console.log(`Length: ${colJquery.length}`)
  colJquery.prop('checked', $(e).prop('checked'));
  $(selector).each(function(){
    let bChecked = $(this).prop('checked'), attrName = $(this).attr('value');
    if (bChecked) {
      $(`.service-tables`).attr(attrName,'');
    } else {
      $(`.service-tables`).removeAttr(attrName);
    }
  });
}

function createDisplaySettingsTable() {
  var categories = {};
  appCfg.data.filter(datum => 'category' in datum).forEach(datum => {
    if (!(datum.category in categories)) categories[datum.category] = [];
    categories[datum.category].push(`${('average' in datum && datum.average) ? `[Avg] ` : ''}${datum.title}`);
  });
  Object.keys(categories).forEach(category => {
    let id = `display-category-${category.replace(/ /g,'-').toLowerCase()}`;
    let lastRow = $('#modal-settings-displayed-fields table tbody').append($('<tr>')).find('tr:last-of-type');
    lastRow.append($('<td>',{class:'align-middle'})).append($('<th>')).append($('<td>'));
    lastRow.find('td:first-of-type').append($('<input>',{type:'checkbox', value:id, id:id, class:'load-from-cookie save-to-cookie'}));
    lastRow.find('th').append($('<label>',{text:category, for:id, class:'font-weight-bold mb-0'}));
    categories[category].forEach(field => lastRow.find('td:last-of-type').append($('<div>',{text:field})));
  });
}

var MODAL = {
  'modal-settings-cookies': {
    initialized: false,
    id: 'modal-settings-cookies',
    obfuscated_cookies: ['dev_mode_key','api_key'],
    checkboxClick: function() {
      let MODAL_ID = $(this).parents('.modal').attr('id');
      if ($(this).parents('th').length != 0) $(`#${MODAL_ID} table tbody input[type=checkbox].select-cookie`).prop('checked',$(this).prop('checked'));
      $(`#${MODAL_ID} .delete-cookies`).prop('disabled',$(`#${MODAL_ID} input[type=checkbox]:checked`).length == 0);
    },
    obfuscateCookie: function() {
      $(this).parent().prev().find('input').attr('type', $(this).prop('checked') ? 'password' : 'text')
    },
    obfuscateCookies: function() {
      $(`#${this.id} .obfuscate-cookie-by-default`).prop('checked',false).click();
    },
    addTableRow: function(options = {}) {
      let lastRow = $(`#${this.id} table tbody`).append($('<tr>')).find('tr:last-of-type');
      lastRow.append($('<td>')).find('td:last-of-type').append($('<input>',{type:'checkbox',class:'disable-when-adding-cookie select-cookie'}));
      lastRow.append($('<td>')).find('td:last-of-type').append($('<input>',{type:'text',class:'border text-center cookie-name'}));
      if ('name' in options)
        lastRow.find('td:last-of-type input:last-of-type').val(options.name).attr('readonly','').addClass('border-0');
      else
        lastRow.find('td:last-of-type input:last-of-type').keyup(this.checkCookieName);
      lastRow.append($('<td>')).find('td:last-of-type').append($('<input>',{type:'text',class:'border text-center cookie-value'}));
      if ('value' in options) lastRow.find('td:last-of-type input:last-of-type').val(options.value).addClass('readonly-when-adding-cookie').change(this.updateCookie);
      lastRow.append($('<td>')).find('td:last-of-type').append($('<input>',{type:'checkbox',class:'obfuscate-cookie'})).find('input').click(this.obfuscateCookie);
    },
    updateTableRows: function() {
      $(`#${this.id} table tbody`).html('');
      Object.keys(Cookies.get()).sort().forEach(function(cookieName) {
        this.addTableRow({name:cookieName,value:Cookies.get(cookieName)});
        //console.log(`${cookieName} - ${this.obfuscated_cookies.includes(cookieName)}`)
        if (this.obfuscated_cookies.includes(cookieName)) $(`#${this.id} table tbody tr:last-of-type .obfuscate-cookie`).addClass('obfuscate-cookie-by-default');
      },this);
      $(`#${this.id} input[type=checkbox].select-cookie`).click(this.checkboxClick);
      this.obfuscateCookies();
    },
    checkCookieName:function() {
      const classes = 'bg-danger,text-white,border-white';
      let badName = ($(this).val().replace(/^ *| *$/g,'') == '');
      if (!badName) badName = (Object.keys(Cookies.get()).includes($(this).val()));
      if (badName)
        classes.split(',').forEach(className => $(this).addClass(className));
      else
        classes.split(',').forEach(className => $(this).removeClass(className));
      $('.save-new-cookie').prop('disabled',badName);
    },
    deleteCookies:function() {
      let MODAL_ID = $(this).parents('.modal').attr('id'), colJquery = $(`#${MODAL_ID} table tbody input[type=checkbox].select-cookie:checked`);
      if (colJquery.length == 0) return;
      colJquery.each(function(){Cookies.remove($(this).parents('tr').find('.cookie-name').val())});
      MODAL[MODAL_ID].updateTableRows();
      $(this).prop('disabled',true);
    },
    updateCookie:function() {
      if (this.hasAttribute('readonly')) return;
      let cookieName = $(this).parents('tr').find('.cookie-name').val(), cookieValue = $(this).val();
      Cookies.set(cookieName, cookieValue, {expires: 365});
    },
    addCookie:function() {
      let MODAL_ID = $(this).parents('.modal').attr('id');
      MODAL[MODAL_ID].addTableRow();
      $('.disable-when-adding-cookie').prop('disabled',true);
      $('.hide-when-adding-cookie').addClass('hidden');
      $('.show-when-adding-cookie').removeClass('hidden');
      $('.readonly-when-adding-cookie').attr('readonly','');
      $(`#${MODAL_ID} tbody tr:last-of-type .cookie-name`).keyup().focus();
      $('.save-new-cookie').prop('disabled',true);
    },
    eatNewCookie: function() {
      let MODAL_ID = $(this).parents('.modal').attr('id');
      let newCookieRow = $(`#${MODAL_ID} tbody tr:last-of-type`);
      if ($(this).hasClass('save-new-cookie')) {
        let cookieName = newCookieRow.find('.cookie-name').val().replace(/^ *| *$/g,''), cookieValue = newCookieRow.find('.cookie-value').val();
        if ($(this).hasClass('bg-danger')) return;
        Cookies.set(cookieName, cookieValue, {expires: 365});
        MODAL[MODAL_ID].updateTableRows();
      } else {
        newCookieRow.remove();
      }
      $('.disable-when-adding-cookie').prop('disabled',false);
      $('.hide-when-adding-cookie').removeClass('hidden');
      $('.show-when-adding-cookie').addClass('hidden');
      $('.readonly-when-adding-cookie').removeAttr('readonly');
    },
    saveToCookie: function() {
      let c = $(this);
      if (c.length == 1) {
        let tagName = c.prop('tagName').toUpperCase(), cookieName = c.attr('id');
        switch (tagName) {
          case 'INPUT':
            let inputType = c.attr('type').toUpperCase();
            switch (inputType) {
              case 'CHECKBOX':
                Cookies.set(cookieName, c.prop('checked') ? 'checked' : 'unchecked', {expires: 365});
                break;
              case 'TEXT':
              case 'PASSWORD':
                Cookies.set(cookieName, c.val(), {expires: 365});
                break;
              case 'NUMBER':
                Cookies.set(cookieName, c.val(), {expires: 365});
                break;
              case 'RADIO':
                Cookies.set(cookieName.replace(/-[^-]+$/,''), c.val(), {expires: 365});
                break;
              default:
                throw new Error(`Unknown INPUT TYPE (${inputType})`);
            }
            break;
          case 'SELECT':
            Cookies.set(cookieName, c.val(), {expires: 365});
            break;
          default:
            throw new Error(`Unknown TAG NAME (${tagName})`);
        }
      }
      MODAL['modal-settings-cookies'].updateTableRows();
    },
    loadCookies: function() {
      Object.keys(Cookies.get()).sort().forEach(function(cookieName) {
        let c = $(`#${cookieName}.load-from-cookie`);
        if (c.length == 1) {
          let tagName = c.prop('tagName').toUpperCase();
          switch (tagName) {
            case 'INPUT':
              let inputType = c.attr('type').toUpperCase();
              switch (inputType) {
                case 'CHECKBOX':
                  let bChecked = Cookies.get(cookieName).toLowerCase() == 'checked';
                  c.prop('checked',!bChecked).click();
                  break;
                case 'TEXT':
                case 'PASSWORD':
                  c.val(Cookies.get(cookieName)).change();
                  break;
                case 'HIDDEN':
                  c.val(Cookies.get(cookieName));
                  $(`input[name="${cookieName}"][value="${Cookies.get(cookieName)}"]`).click();
                  break;
                case 'NUMBER':
                  if (/^[1-9][0-9]*$/) c.val(Cookies.get(cookieName)).change();
                  break;
                default:
                  throw new Error(`Unknown INPUT TYPE (${inputType})`);
              }
              break;
            case 'SELECT':
              let selectedIndex = c.prop('selectedIndex');
              if (c.val(Cookies.get(cookieName)).prop('selectedIndex') == -1) c.prop('selectedIndex',selectedIndex);
              break;
            default:
              throw new Error(`Unknown TAG NAME (${tagName})`);
          }
        }
      });
    },
    init: function() {
      if (this.initialized) {
        bootstrapAlert('Unexpected Internal Issue','Sorry, modalCookieWindow cannot be re-initialized');
        return;
      }
      this.updateTableRows();
      $(`#${this.id}`).blur(this.obfuscateCookies);
      $(`#${this.id} button.delete-cookies`).click(this.deleteCookies);
      $(`#${this.id} button.add-cookie`).click(this.addCookie);
      $(`#${this.id} button.save-new-cookie`).click(this.eatNewCookie);
      $(`#${this.id} button.cancel-new-cookie`).click(this.eatNewCookie);
      $(`#${this.id} th input[type=checkbox].select-cookie`).click(this.checkboxClick).click().click();
      this.initialized = true;
    }
  },
};

function changeDataFormat(e) {
  $(`#${$(e).attr('name')}`).val($(e).val());
  apiData[$(e).val().replace(/-/,'_')] = $(e).val();
  $('body').attr($(e).attr('name'), $(e).val());
}

function createNumberFormatTable() {
  const formatCfg = {
    bytes: {
      label: "Bandwidth",
      id: "bytes-format",
      formats: "integer,comma-separated,abbreviated",
    },
    requests: {
      label: "Count",
      id: "requests-format",
      formats: "integer,comma-separated",
    },
  };
  const labelText = {
    "abbreviated": "Abbreviated (1.235 TB)",
    "comma-separated": "Comma Separated (1,234,567,890)",
    "integer": "Integer (1234567890)",
  };
  Object.keys(formatCfg).forEach(key => {
    $('#modal-settings-number-formats tbody')
    let lastRow = $('#modal-settings-number-formats table tbody').append($('<tr>')).find('tr:last-of-type');
    let lastCell = lastRow.append($('<th>',{text:formatCfg[key].label})).append($('<td>',{class:'text-left'})).find('td');
    lastCell.append($('<input>',{type:'hidden',id:formatCfg[key].id,class:'load-from-cookie'}));
    formatCfg[key].formats.split(',').forEach((format,index) => {
      lastCell.append($('<div>',{class:'form-check'})).find('div:last-of-type')
        .append($('<input>',{type:'radio', class:'form-check-input', name:formatCfg[key].id, id:`${formatCfg[key].id}-${index}`, value:format, class:'save-to-cookie'}))
        .append($('<label>',{class:'form-check-label pl-2', for:`${formatCfg[key].id}-${index}`, text:(format in labelText) ? labelText[format] : format}))
    });
    lastRow.find('input:last-of-type').click();
  });
}

function addCatgoryStyles() {
  let styles = [];
  styles.push('');
  styles.push('.service-tables .th-td { display: none; }');
  styles.push(`.service-tables[display-category-default] .th-td.display-category-default { display: table-cell; }`)
  appCfg.categories.forEach(category => styles.push(`.service-tables[${category}] .th-td.${category} { display: table-cell; }`));
  styles.push('');
  $('head').append($('<style>',{type:'text/css'})).find('style:last-of-type').append( document.createTextNode(styles.join('\n')) );
}

var devMode = {
  status: false,
  cookie: 'dev_mode',
  attrName: 'dev-mode',
  set: function(newStatus) {
    this.status = newStatus;
    if (newStatus)
      $('body').attr(this.attrName,'');
    else
      $('body').removeAttr(this.attrName);
  },
  value: function(newStatus = null) {
    if (typeof newStatus != 'boolean') return this.status;
    this.set(newStatus);
  },
  on: function() { this.set(true); },
  off: function() { this.set(false); },
  init: function() {
    this.set( Cookies.get(this.cookie) == "on" );
    return this.status;
  }
}

function switchModal(id) {
  $('.modal-close').click();
  setTimeout(function(){
    $(`#${id}`).click();
  },1000,this);
}

function initialize() {
  
  // Initial initialization...
  
  appCfg.init();
  addCatgoryStyles();
  
  // Finish page...
  
  createDataTables();
  createStatsDataSourceTable();
  createOtherDataSourceTable();
  createDisplaySettingsTable();
  createNumberFormatTable();
  MODAL['modal-settings-cookies'].init();
  $('a[modal-id]').click( function() { switchModal($(this).attr('modal-id')); } );
  
  // Set Dev Override if necessary
  
  if (/^get-((customer|service)-)?stats\.global\.ssl\.fastly\.net$/.test(location.hostname)) {
    $( '.obscure' ).removeClass('obscure');
    $( '.not-obscured' ).addClass('obscure');
    $( '#banner-content-obscure' ).attr('id','banner-content');
    if ( devMode.init() ) $('body').attr('dev-mode','');
  }
  
  // Fields...
  
  //$( '#idType' ).change(function() { changeInputIdType(); }).change();
  $( '.id-type' ).focus(function() { changeInputIdType(this); }).change();
  $( "#fromDate" )
    .datepicker({ format: 'yyyy-mm-dd', endDate: daysFromNow(0), autoclose: true, })
    .datepicker( "setDate", daysFromNow(-30)).attr("previous-value",$( "#fromDate" ).val());
  $( "#toDate" )
    .datepicker({ format: 'yyyy-mm-dd', endDate: daysFromNow(0), autoclose: true, })
    .datepicker( "setDate", daysFromNow(-1)).attr("previous-value",$( "#toDate" ).val());
  $( '.date-picker' ).change(function() { checkDates(this); });
  $( '#elapsedDays' ).val(elapsedDays());
  $( '#average_divisor' ).change(function(){ updateAverageDivisor(); }).change();
  initializeAverageDivisor();
  $( '#shielding_multiplier' ).change(function() { updateShieldingMultiplier(); });
  $( '#export_footer' ).change(function(){apiData.export_footer=$(this).prop('checked');}).change();
  $( '.required-input' ).change(function() { checkInputs(this); }).keyup(function() { checkInputs(this); });
  $( '.select-service' ).click(function() { updateSelectedServices(this); });
  
  // Buttons...
  
  $( '#get-data' ).click(function() { stateTransition(0); });
  $( '#halt-get-data' ).click(function() { $('#kill-switch').prop("checked",true); });
  $( '#export-data' ).click(function() { exportData(); });
  $( '#clear-data' ).click(function() { clearData(); });
  $( '#reload-page' ).click(function() { location.reload(); });
  
  // Menu and Modals...
  
  $( '.nav-item.dropdown a.dropdown-item:not(.skip)' ).click(function() { $(`#modal-${this.id}`).blur().modal('show'); });
  $( '#modal-settings-displayed-fields input[type=checkbox]' ).click(function() { selectCategories(this); });
  $( 'a[select-by]' ).click(function() { quickSelectServices(this); });
  $( '#modal-settings-number-formats input[type=radio]' ).click( function() { changeDataFormat(this); });
  $( '#modal-settings-number-formats td div:last-of-type input[type=radio]' ).click();
  loadSampleExportData();
  
  // Final initialization...
  
  clearData();
  $('#service_id').focus();
  $( '.results.hidden' ).removeClass( 'hidden' );
  if (!devMode.status) $('#modal-help-disclaimer').modal('show');
  MODAL['modal-settings-cookies'].loadCookies();
  $('.save-to-cookie').change( MODAL['modal-settings-cookies'].saveToCookie );
}