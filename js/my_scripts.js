var DEBUG = false;
var DEBUG_API_CALLS = false;
var SAVE_STATS_DATA = false;
var apiData = {}, statData = {totals:{},stats:{},data:{}}, svcData=[], tmpSvcData=[];
var apiCallCounter = 0;
var serviceData = [];

var appCfg = {
  data: [],
  categories: [],
  stats: [],
  init: function() {
    if (!appCfgData) throw new Error('appCfgData not found');
    this.data = [...appCfgData];
    this.data.filter(datum => 'stats' in datum).forEach(datum => {
      datum.stats.split(',').forEach(stat => { if(!this.stats.includes(stat)) this.stats.push(stat); });
    },this);
    this.data.filter(datum => 'category' in datum).forEach(datum => {
      let category = `category-${datum.category.replace(/ /g,'-').toLowerCase()}`;
      if(!this.categories.includes(category)) this.categories.push(category);
    },this);
  },
  getFieldForName: function(field, nameVal) {
    let a = this.data.filter(datum => 'name' in datum ? (datum.name == nameVal) : false );
    if (a.length == 0) throw new Error(`Name not found (${nameVal})`);
    if (!(field in a[0])) throw new Error(`Field not found (${field}) for name (${nameVal})`);
    return a[0][field];
  }
};

function isObject(value) {
  return value && typeof value === 'object' && value.constructor === Object;
}

function commaFormat(i) {
  return i.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function byteFormat(i) {
  var unit = ",KILO,MEGA,GIGA,TERA,PETA,EXA".split(",");
  var power = Math.trunc((i.toString().length-1)/3);
  var num = (power==0) ? i : ((i / (1000**power)).toFixed(3));
  return `${num} ${unit[power].substr(0,1)}B`;
}

function newDate(p,b) {
  b = (typeof b == "boolean") ? b : false;
  let d = new Date(p);
  return (b) ? (d.toISOString().substr(0,10)) : d;
}

function elapsedDays() {
  return (newDate($('#toDate').val()) - newDate($('#fromDate').val())) / (24 * 3600 * 1000) + 1;
}

function daysFromNow(days) {
  if (typeof days != "number") days = 0;
  var today = new Date();
  today.setDate(today.getDate() + days);
  return today;
}

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function bootstrapAlert(txtTitle, txtBody, bGoLarge = false) {
  let colJquery = $('#modal-generic');
  if (bGoLarge)
    colJquery.find( '.modal-dialog' ).addClass('modal-lg');
  else
    colJquery.find( '.modal-dialog' ).removeClass('modal-lg');
  if (txtTitle == '') {
    colJquery.find( '.modal-header' ).addClass('hidden');
    colJquery.find( '.modal-footer' ).removeClass('hidden');
  } else {
    colJquery.find( '.modal-footer' ).addClass('hidden');
    colJquery.find( '.modal-header' ).removeClass('hidden');
  }
  colJquery.find('.modal-title').html(`Error: ${txtTitle}`);
  colJquery.find('.modal-body').html(txtBody);
  $('#modal-button').click();
}

function translateUrl(url = null) {
  if (url==null) url = 'https://get-service-stats.global.ssl.fastly.net/stats/service/SERVICE_ID/field/FIELD_NAME?service_id=zNCRpZDgpMCngEco6VSkn&field_name=requests&from=2021-01-27&to=2021-02-26&by=day';
  url = url.replace('get-service-stats.global.ssl.fastly.net', 'api.fastly.com');
  let qs_params = {}, new_qs = [];
  let bareUrl = url.replace(/\?.*$/,'');
  url.replace(/^.*\?/,'').split('&').forEach(kvp => {
    let tmp = kvp.split('='), key = tmp[0], val = tmp[1];
    qs_params[kvp[0]] = kvp[1];
    if (bareUrl.includes(key.toUpperCase())) {
      bareUrl = bareUrl.replace(key.toUpperCase(),val);
    } else {
      new_qs.push(kvp);
    }
  })
  if (new_qs.length > 0) bareUrl += `?${new_qs.join('&')}`
  return bareUrl;
}

function makeApiXhr(method, url, data, postProcessFunction, extraHeaders) {
  if (DEBUG) console.log(`makeApiXhr(): ${method} ${url}`);
  if (DEBUG_API_CALLS) console.log(`${method} ${translateUrl(url)}`);
  if (typeof extraHeaders == "undefined") extraHeaders = {};
	var xhr = new XMLHttpRequest();
	xhr.open(method, url, true);
  xhr.setRequestHeader("Fastly-Debug", 1);
  xhr.setRequestHeader("Fastly-Key", apiData.api_key);
	//xhr.setRequestHeader("Accept", "application/vnd.api+json");
	xhr.setRequestHeader("Accept", "application/json");
	//if (method == "POST") xhr.setRequestHeader("Content-Type", "text/plain");
  /*
  if (extraHeaders)
    Object.keys(extraHeaders).forEach(key => {
      xhr.setRequestHeader(key, extraHeaders[key]);
    });
  */
	xhr.onreadystatechange = function() { if (xhr.readyState === 4) postProcessFunction(xhr); };
	if (method == "POST") { xhr.send(data); } else { xhr.send(); }
}

function xhrError(errMsgs,statusCode) {
  $('[data-dismiss="modal"]').click(function(){
    stateTransition();
    $('[data-dismiss="modal"]').off('click');
  })
  bootstrapAlert('XHR Issues',`${(statusCode in errMsgs) ? errMsgs[statusCode] : "Uknown Error"}<br>(HTTP Response Code = ${statusCode})`);
}

function getServiceInfo(nextState) {
  var url = `https://${location.hostname}/service/SERVICE_ID?service_id=${apiData.service_id}`;
  makeApiXhr("GET", url, null, function(xhr) {
		if (xhr.status === 200) {
      var responseData = JSON.parse(xhr.responseText);
      //console.log(JSON.stringify(responseData,null,"  "));
      svcData.push( {
        service_id:apiData.service_id,
        service_name:responseData.name
      } );
      apiData.customer_id = responseData.customer_id;
      $('#customerId').val(apiData.customer_id);
      stateTransition(nextState);
    } else {
      xhrError({401:'Bad API Key',404:'Bad Service ID'},xhr.status);
      console.log(`getServiceInfo():  HTTP Error (Status = ${xhr.status})`);
    }
	});
}

function getServiceDetails(nextState) {
  var url = `https://${location.hostname}/service/SERVICE_ID/details?service_id=${apiData.service_id}`;
  makeApiXhr("GET", url, null, function(xhr) {
		if (xhr.status === 200) {
      var responseData = JSON.parse(xhr.responseText);
      //console.log(JSON.stringify(responseData,null,"  "));
      try {
        tmpSvcData.backendShieldCount = responseData.active_version.backends.filter( be => be.shield!=null && be.shield!='').length;
      } catch(err) {
        tmpSvcData.backendShieldCount = 0;
      }
      try {
        tmpSvcData.wafCount = responseData.active_version.wafs.length;
      } catch(err) {
        tmpSvcData.wafCount = 0;
      }
      try {
        tmpSvcData.edgeComputeCount = ('package' in responseData.active_version) ? 1 : 0;
      } catch(err) {
        tmpSvcData.edgeComputeCount = 0;
      }
      
      tmpSvcData.service_name = responseData.name;
      
      stateTransition(nextState);
    } else {
      xhrError({401:'Bad API Key',404:'Bad Service ID'},xhr.status);
      console.log(`getServiceDetails():  HTTP Error (Status = ${xhr.status})`);
    }
	});
}

function getCustomerServices(nextState) {
  //var url = `https://${location.hostname}/customer/CUSTOMER_ID/services?customer_id=${apiData.customer_id}`;
  var url = `https://${location.hostname}/customer/CUSTOMER_ID/service_ids?customer_id=${apiData.customer_id}`;
  makeApiXhr("GET", url, null, function(xhr) {
		if (xhr.status === 200) {
      var responseData = JSON.parse(xhr.responseText);
      //console.log(JSON.stringify(responseData,null,"  "));
      responseData.forEach( (oSvc) => svcData.push( {
        //service_id:oSvc.id,
        //service_name:oSvc.name
        service_id:oSvc,
        service_name:"-"
      } ) );
      //console.log(JSON.stringify(svcData,null,"  "));
      stateTransition(nextState);
    } else {
      xhrError({401:'Bad API Key',404:'Bad Customer ID'},xhr.status);
      console.log(`getCustomerInfo():  HTTP Error (Status = ${xhr.status})`);
    }
	});
}

function getCustomerInfo(nextState) {
  var url = `https://${location.hostname}/customer/CUSTOMER_ID?customer_id=${apiData.customer_id}`;
  makeApiXhr("GET", url, null, function(xhr) {
		if (xhr.status === 200) {
      var responseData = JSON.parse(xhr.responseText);
      //console.log(JSON.stringify(responseData,null,"  "));
      apiData.customer_name = responseData.name;
      $('#customerName').val(apiData.customer_name);
      stateTransition(nextState);
    } else {
      xhrError({401:'Bad API Key',404:'Bad Customer ID'},xhr.status);
      console.log(`getCustomerInfo():  HTTP Error (Status = ${xhr.status})`);
    }
	});
}

function getServiceStats(fieldName, nextState) {
  var fromDateMinusOne = newDate(addDays(apiData.from_date,-1),true),
      // toDatePlusOne = newDate(addDays(apiData.to_date,1),true),
      qs = `service_id=${apiData.service_id}&field_name=${fieldName}\&from=${fromDateMinusOne}\&to=${apiData.to_date}\&by=day`,
      //qs = `service_id=${apiData.service_id}&field_name=${fieldName}\&from=${apiData.from_date}\&to=${toDatePlusOne}\&by=day`,
      url = `https://${location.hostname}/stats/service/SERVICE_ID/field/FIELD_NAME?${qs}`;
  //url += ((url.includes("?")) ? "&" : "?") + "HTTPBIN=1";
  makeApiXhr("GET", url, null, function(xhr) {
		if (xhr.status === 200) {
      var responseData = JSON.parse(xhr.responseText);
      //console.log(JSON.stringify(responseData,null,"  "));
      if (SAVE_STATS_DATA) {
        if (!(apiData.service_id in statData.data)) statData.data[apiData.service_id] = {};
        statData.data[apiData.service_id][fieldName] = Object.assign({}, responseData.data);
      }
      let total = 0;
      responseData.data.forEach((o) => { total += o[fieldName]; });
      statData.stats[apiData.service_id][fieldName] = total;
      //console.log(`${apiData.service_id} / ${fieldName}: ${total}`)
      stateTransition(nextState);
    } else {
      xhrError({401:'Bad API Key',404:'Bad Service ID'},xhr.status);
      console.log(`getServiceStats():  HTTP Error (Status = ${xhr.status})`);
    }
	});
}

function getAllServiceStats(nextState) {
  var fromDateMinusOne = newDate(addDays(apiData.from_date,-1),true),
      qs = `service_id=${apiData.service_id}\&from=${fromDateMinusOne}\&to=${apiData.to_date}\&by=day`,
      url = `https://${location.hostname}/stats/service/SERVICE_ID?${qs}`;
  //url += ((url.includes("?")) ? "&" : "?") + "HTTPBIN=1";
  makeApiXhr("GET", url, null, function(xhr) {
		if (xhr.status === 200) {
      var responseData = JSON.parse(xhr.responseText);
      //console.log(JSON.stringify(responseData,null,"  "));
      appCfg.stats.forEach( stat => {
        if (SAVE_STATS_DATA) {
          if (!(apiData.service_id in statData.data)) statData.data[apiData.service_id] = {};
          statData.data[apiData.service_id][stat] = Object.assign({}, responseData.data);
        }
        let total = 0;
        responseData.data.forEach((o) => { total += o[stat]; });
        statData.stats[apiData.service_id][stat] = total;
        //console.log(`${apiData.service_id} / ${stat}: ${total}`)
      });
      stateTransition(nextState);
    } else {
      xhrError({401:'Bad API Key',404:'Bad Service ID'},xhr.status);
      console.log(`getServiceStats():  HTTP Error (Status = ${xhr.status})`);
    }
	});
}

function getUserInfo(nextState) {
  var url = `https://${location.hostname}/current_user`;
  makeApiXhr("GET", url, null, function(xhr) {
		if (xhr.status === 200) {
      var responseData = JSON.parse(xhr.responseText);
      //console.log(JSON.stringify(responseData,null,"  "));
      apiData.user_role = responseData.role;
      $('#userRole').val(apiData.user_role);
      stateTransition(nextState);
    } else {
      xhrError({401:'Bad API Key',404:'Bad Service ID'},xhr.status);
      console.log(`getUserInfo():  HTTP Error (Status = ${xhr.status})`);
    }
	});
}

function getCsvData() {
  function quote(t) {
    let n = Number(t);
    return (t == '' || isNaN(n)) ? `"${t.replace(/"/g,'""')}"` : n;
  }
  function csvify(arrOfItems) {
    return arrOfItems.map(item => quote(item)).join(',');
  }
  function createFooterItemArray(key, val) {
    return [`${key}:`, val];
  }
  
  let data = {totals:[],services:[]}, csvData = [], totalFields = {};
  
  data.totals.push([]);
  $('#service-totals thead tr th').each(function(){
    data.totals[data.totals.length -1].push($(this).text());
  });
  $('#service-totals tbody tr').each(function(){
    data.totals.push([]);
    $(this).find('td').each(function(){
      data.totals[data.totals.length -1].push(($(this).children().length == 0) ? $(this).text() : $(this).find('span.integer').text());
    });
  });
  
  data.services.push([]);
  $('#service-data thead tr th:not(:first-of-type)').each(function(){
    data.services[data.services.length -1].push($(this).text().replace(/⇧/g,''));
  });
  $('#service-data tbody tr').each(function(){
    data.services.push([]);
    $(this).find('td:not(:first-of-type)').each(function(){
      data.services[data.services.length -1].push(($(this).children().length == 0) ? $(this).text() : $(this).find('span.integer').text());
    });
  });
  
  data.totals[0].forEach((item, index) => totalFields[item] = data.totals[1][index]);
  data.services.forEach(row => csvData.push(csvify(row)));
  
  let otherFields = [
    {name:'Customer ID', id:'customerId', placement:'prepend'},
    {name:'Customer Name', id:'customerName', placement:'prepend'},
    {name:'From Date', id:'fromDate', placement:''},
    {name:'To Date', id:'toDate', placement:''},
    {name:'Date Range', id:'', placement:'append'},
    {name:'Days of Data', id:'elapsedDays', placement:'append'},
  ];
  otherFields.forEach((o,index) => {
    if (o.id != '') o.value = $(`#${o.id}`).val();
    if (o.name == 'Date Range') o.value = `${otherFields[index - 1].value} - ${otherFields[index - 2].value}`;
  });
  
  if (apiData.export_footer) {
    csvData.push("");
    csvData.push("");
    otherFields.forEach(o => { if (o.placement == 'prepend') csvData.push(csvify(createFooterItemArray(o.name, o.value))); } );
    Object.keys(totalFields).forEach(field => csvData.push(csvify(createFooterItemArray(field, totalFields[field]))));
    otherFields.forEach(o => { if (o.placement == 'append') csvData.push(csvify(createFooterItemArray(o.name, o.value))); } );
  }
  
  return(csvData.join('\n'));
}

var textFile = null;
function makeTextFile(text) {
  var data = new Blob([text], {type: 'text/plain'});

  // If we are replacing a previously generated file we need to
  // manually revoke the object URL to avoid memory leaks.
  if (textFile !== null) { window.URL.revokeObjectURL(textFile); }

  textFile = window.URL.createObjectURL(data);

  return textFile;
}

function clearData(keepData = false) {
  progressBar.resetAll();
  $('#service-data tbody').html('');
  $('#output').html('');
  updateTotals();
  $('.input-id-type-dependent[readonly]').val('');
  if (!keepData) serviceData = [];
}

function formatBytes(formatType,bytes) {
  //console.log(`formatBytes(${formatType},${bytes})`)
  switch(formatType) {
    case 'integer': return bytes;
    case 'abbreviated': return byteFormat(bytes);
    case 'comma-separated': return commaFormat(bytes);
  }
  throw new Error(`formatBytes(): Unknown format type "${formatType}"`);
}

function updateSelectedServices(e) {
  console.log('OK')
  switch(e.parentElement.tagName) {
    case "TH":
      $( 'td .select-service' ).prop('checked',$( e ).prop('checked'));
      serviceData.forEach(datum => datum.selected = $( e ).prop('checked'));
      break;
    case "TD":
      let rowIndex = getRowIndex(e);
      serviceData[rowIndex].selected = !serviceData[rowIndex].selected;
      break;
    default:
      throw new Error(`Unexpected parental tag name (${e.parentElement.tagName})`)
  }
  updateTables();
}

var progressBar = { /* OK */
  config: {
    customer: {selector: '.customer-progress-bar'},
  },
  steps: { customer: 1 },
  step: { customer: 0 },
  update: function(progressBarName, newStep) {
    if (typeof newStep !== "undefined") this.step[progressBarName] = newStep;
    if (!(progressBarName in this.config)) throw new Error(`progressBar(): Type "${progressBarName}" not found in configuration"`);
    if (!(progressBarName in this.steps) || !(progressBarName in this.step)) throw new Error(`progressBar(): Type "${progressBarName}" not initialized"`);
    if (typeof newStep === "undefined") this.step[progressBarName]++;
    let progress = Math.round(100*this.step[progressBarName]/this.steps[progressBarName]), selector = this.config[progressBarName].selector;
    if (progress==100)
      $(selector).removeClass('progress-bar-animated');
    else
      $(selector).addClass('progress-bar-animated');
    $(selector).attr('style',`width:${progress}%`).html(`${progress}%`);
  },
  reset: function(progressBarName) {
    if (!(progressBarName in this.step)) throw new Error(`progressBar(): Type "${progressBarName}" not initialized"`);
    this.update(progressBarName, 0);
  },
  resetAll: function() {
    var self = this;
    Object.keys(this.step).forEach(function(progressBarName) {
      self.reset(progressBarName);
    });
  },
  init: function(progressBarName,steps) {
    if (typeof steps === "undefined") {
      if (progressBarName in this.steps) return this.steps[progressBarName];  
      throw new Error(`progressBar(): Type "${progressBarName}" not initialized"`);
    }
    this.steps[progressBarName] = steps;
    this.step[progressBarName] = 0;
  }
}

function disableControlsWhileGettingData(bGettingData) { /* OK */
  if (bGettingData) {
    $('.user-inputs .form-group').addClass('pseudo-disabled')
    $( `.user-inputs select` ).addClass(`pseudo-disabled`);
    $( `.user-inputs input` ).addClass(`pseudo-disabled`);
    $( `.pseudo-disabled-hack` ).addClass(`pseudo-disabled`);
  } else {
    $( `.pseudo-disabled` ).removeClass(`pseudo-disabled`);
  }
  $( `.user-inputs select` ).prop('disabled', bGettingData);
  $( `.user-inputs input` ).prop('disabled', bGettingData);
  $( '#service-data input' ).prop('disabled', bGettingData);
  if (bGettingData) {
    $( '[data-toggle=dropdown]' ).attr('data-toggle','dropdown-pseudodisabled');
    $( '.normally-not-hidden' ).hide();
    $( '#halt-get-data' ).fadeIn();
  } else {
    $( '[data-toggle=dropdown-pseudodisabled]' ).attr('data-toggle','dropdown');
    $( '#halt-get-data' ).hide();
    $( '.normally-not-hidden' ).fadeIn();
  }
}

function stateTransition(state,nextState) { /* OK */
  let fieldName = '';
  if ($('#kill-switch').prop("checked")) {
    $('#kill-switch').prop("checked",false);
    $('[data-dismiss="modal"]').click(function(){
      stateTransition(-2);
      $('[data-dismiss="modal"]').off('click');
    })
    bootstrapAlert('Getting Data Halted','All data collection and processing has been stopped');
    return;  
  }
  if (typeof state == "undefined") {
    state = -1;
  } else {
    nextState = (typeof nextState == "undefined") ? (state+1) : nextState;
  }
  /*
  console.group(`stateTransition( state = ${state}, nextState = ${nextState} )`);
  console.log(`${JSON.stringify(apiData,null,"  ")}`);
  console.groupEnd();
  */
  switch(state) {
    case -2:
      disableControlsWhileGettingData(false);
      return;
    case -1:
      progressBar.resetAll();
      disableControlsWhileGettingData(false);
      return;
    case 0:
      progressBar.init("customer", 1);
      statData = {totals:{},stats:{},data:{}};
      clearData();
      if (DEBUG) console.log(`${state}: Initializing general variables...`);
      disableControlsWhileGettingData(true);
      apiData.api_key = $('#apiKey').val();
      apiData.from_date = $('#fromDate').val();
      apiData.to_date = $('#toDate').val();
      apiData.shielding_multiplier = parseFloat($('#shieldingMultiplier').val());
      svcData=[];
      getUserInfo(nextState);
      return;
    case 1:
      if (DEBUG) console.log(`${state}: Getting Service info...`);
      apiData.id_type = $('#idType').val()
      switch(apiData.id_type) {
        case "customer":
          progressBar.init("customer", null);
          if (apiData.user_role == "billing") {
            $('#kill-switch').prop("checked",false);
            $('[data-dismiss="modal"]').click(function(){
              stateTransition(-2);
              $('[data-dismiss="modal"]').off('click');
            });
            bootstrapAlert('Insuffient Privileges','The supplied API Key has a "billing" User Role which cannot be used with the "Customer ID" Input ID Type');
            return; 
          }
          apiData.customer_id = $('#customerId').val();
          getCustomerServices(nextState);
          break;
        case "service":
          apiData.service_id = $('#serviceId').val();
          getServiceInfo(nextState);
          break;
        default:
          throw new Error(`Unknown ID Type: ${apiData.id_type}`);          
      }
      return;
    case 2:
      if (DEBUG) console.log(`${state}: Initializing Service variables...`);
      if (progressBar.init("customer") == null) progressBar.init("customer", svcData.length);
      tmpSvcData = svcData.shift();
      $('#serviceName').val(tmpSvcData.service_name);
      if (apiData.id_type == "customer") {
        apiData.service_id = tmpSvcData.service_id;
        $('#serviceId').val(apiData.service_id);
      }
      statData.stats[apiData.service_id] = {};
      statData.totals[apiData.service_id] = {};
      statData.totals[apiData.service_id].service_name = tmpSvcData.service_name;
      stateTransition(nextState);
      return;
    case 3:
      if (DEBUG) console.log(`${state}: Making Parallel API Calls...`);
      var doFunction = [
        function() { getServiceDetails(nextState); },
        function() { getAllServiceStats(nextState); },
      ];
      //appCfg.stats.forEach(stat => { doFunction.push( function() { getServiceStats(stat,nextState); } ); });
      if ($('#customerName').val() == "") doFunction.push( function() { getCustomerInfo(nextState); } );
      apiCallCounter = doFunction.length;
      doFunction.forEach( f => f() );
      return;
    case 4:
      --apiCallCounter;
      if (apiCallCounter != 0) return;
      
      $('#serviceName').val(tmpSvcData.service_name);
      statData.totals[apiData.service_id].service_name = tmpSvcData.service_name;
      
      stateTransition(nextState);
      return;
    case 5:
      if (apiCallCounter != 0) return;
      if (DEBUG) console.log(`${state}: Post-processing data...`);
      let oStats = statData.stats[apiData.service_id],
          oTotals = statData.totals[apiData.service_id];
      
      let serviceDataValue = {
        "service-id": apiData.service_id,
        "service-name": oTotals.service_name,
        "shielding": (tmpSvcData.backendShieldCount > 0),
        "waf": (tmpSvcData.wafCount > 0),
        "edge-compute": (tmpSvcData.edgeComputeCount > 0),
      };
      
      appCfg.data.filter(datum => 'stats' in datum).forEach(datum => {
        serviceDataValue[datum.name] = 0;
        datum.stats.split(',').forEach(stat => {
          if (!(stat in oStats)) throw new Error(`Unknown stat (${stat})`);
          serviceDataValue[datum.name] += oStats[stat];
        });
      });
      
      let rowIndex = serviceData.length;
      serviceData.push({selected: true, row: rowIndex});
      appCfg.data.forEach( datum => {
        if (datum.name in serviceDataValue) serviceData[rowIndex][datum.name] = serviceDataValue[datum.name];
        if ('average' in datum && datum.average) {
          let averageValue =  Math.round( serviceDataValue[datum.name] / apiData.average_divisor );
          serviceData[rowIndex][`average-${datum.name}`] = averageValue;
        }
        if ('adjust' in datum && datum.adjust) {
          serviceData[rowIndex][`${datum.name}-adjusted`] = Math.round( serviceDataValue[datum.name] * apiData.shielding_multiplier );
          serviceData[rowIndex][`average-${datum.name}-adjusted`] = Math.round( serviceDataValue[datum.name] * apiData.shielding_multiplier / apiData.average_divisor);
        }
      });
      
      addDataTableRow('data');
      
      let rowSelector = `#service-data tbody .row${rowIndex}`;
      
      $('#bytesFormat').change();
      
      stateTransition(999);
      return;
    case 999:
      progressBar.update("customer");
      if (svcData.length>0) {
        if (DEBUG) console.log(`-: Not Done Yet...`);
        stateTransition(2);
      } else {
        if (DEBUG) console.log(`-: Done`);
        setTimeout(()=>{
          disableControlsWhileGettingData(false);
        },1000);
      }
      return;
    default:
      bootstrapAlert("Internal Issue", `State Transition Error - Unknown State: "${state}"`);
      return;
  }
}

function checkInputs(e) { /* OK */
  const x = {serviceId:"serviceName",customerId:"customerName",apiKey:"userRole"};
  if (typeof e !== "undefined") { 
    if (e.id in x) $( `#${x[e.id]}` ).val('');
  }
  if ($('.bad-input').length != 0) {
    $( '#get-data' ).prop('disabled', true);
    return;
  }
  let bAllInputsPopulated = true;
  //console.group("checkInputs()");
  $( '.required-input' ).each(function(){
    bAllInputsPopulated = bAllInputsPopulated && /^\S+$/.test($(this).val());
    //console.log(`$(this).attr('id')`);
  });
  $( '#get-data' ).prop('disabled', !bAllInputsPopulated);
  //console.groupEnd();
}

function sortTableData(field,order) { /* OK */
  if ($('#service-data thead th input.select-service:disabled').length==1) return;
  /* https://www.sitepoint.com/sort-an-array-of-objects-in-javascript/ */
  function compareValues(key, order='asc') {
    return function(a, b) {
      if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) { return 0; }

      const varA = (typeof a[key] === 'string') ? a[key].toUpperCase() : a[key];
      const varB = (typeof b[key] === 'string') ? b[key].toUpperCase() : b[key];

      let comparison = 0;
      if (varA > varB) {
        comparison = 1;
      } else if (varA < varB) {
        comparison = -1;
      }
      return ( (order == 'desc') ? (comparison * -1) : comparison );
    };
  }
  if (typeof order == "undefined") order = "asc";
  if (!(["asc","desc"].includes(order))) throw new Error(`sortTableData(): Unknown order "${order}"`);
  let tblData = [];
  $('#service-data tbody tr').each(function(){
    let className = $(this).attr('class'),
        selector2 = `#service-data tbody tr.${className} td.${field}`,
        selector1 = `${selector2} span.integer`,
        data = ($(selector1).length == 1) ? $(selector1).text() : $(selector2).text();
    tblData.push( {
      class: className,
      data: (isNaN(Number(data)) || data == '') ? data : Number(data),
    } );
  });
  tblData.sort(compareValues('data',order));
  tblData.forEach(function(o){ $('#service-data tbody').append( $(`#service-data tbody tr.${o.class}`) ); });
}

function getTotals() {
  let totalData = {};
  $('#service-totals tbody tr td[key]').each(function(){
    let key = $(this).attr('key'), val = (key in totalData) ? totalData[key] : 0, c = $(`#service-totals tbody tr td[key=${key}] span.integer`);
    totalData[key] = parseInt((c.length == 0) ? $(this).text() : c.text());
  });
  return totalData;
}

function setTotals(totalData = {}) {
  $('#service-totals tbody tr td[key]').each(function(){
    let key = $(this).attr('key'), val = (key in totalData) ? totalData[key] : 0, c = $(`#service-totals tbody tr td[key=${key}] span`);
    if (c.length == 0) {
      $(this).text(val);
    } else {
      c.each(function(){
        let formatType = $(this).attr('class');
        $(this).text( formatBytes(formatType,val) );
      });
    }
  });
}

function reloadTables() {
  setTotals();
  $(`#service-data tbody`).html('');
  serviceData.forEach(datum => addDataTableRow('data',datum));
  $('#service-data tbody input').removeAttr('disabled');
}

function updateTables() {
  //disableControlsWhileGettingData(true);
  console.log('Table update started')

  let averageDivisor = Number($('#averageDivisor').val());
  let shieldingMultiplier = Number($('#shieldingMultiplier').val());
  // Clear totals
  setTotals();
  let totalsData = getTotals();
  // Process data
  serviceData.forEach(datum => {
    // Adjust data
    Object.keys(datum).filter(key => key.endsWith('-adjusted')).forEach(key => {
      let nonAdjustedKey = key.replace(/-adjusted$/,'');
      if (!(nonAdjustedKey in datum)) throw new Error(`nonAdjustedKey not found (${nonAdjustedKey})`);
      datum[key] = Math.round(datum[nonAdjustedKey] * shieldingMultiplier);
    });
    // Average data
    Object.keys(datum).filter(key => key.startsWith('average-')).forEach(key => {
      let nonAverageKey = key.replace(/^average-/,'');
      if (!(nonAverageKey in datum)) throw new Error(`nonAverageKey not found (${nonAverageKey})`);
      datum[key] = Math.round(datum[nonAverageKey] / averageDivisor);
    });
    Object.keys(datum).filter(key => !key.endsWith('-adjusted')).forEach(key => {
      let adjustedKey = `${key}-adjusted`;
      // Display data
      let val = datum[(adjustedKey in datum) ? adjustedKey : key];
      if (typeof val == 'number') {
        var c = $(`#service-data tbody tr.row${datum.row} td[key=${key}] span`);
        if (c.length == 0) {
          $(`#service-data tbody tr.row${datum.row} td[key=${key}]`).text(val);
        } else {
          c.each(function(){
            let formatType = $(this).attr('class');
            $(this).text( formatBytes(formatType,val) );
          });
        }
      }
      // Calculate totals
      if (datum.selected) {
        if (key in totalsData) {
          totalsData[key] += val;
        } else {
          switch(key) {
            case 'row':
            case 'service-id':
            case 'service-name':
              break;
            case 'selected':
              totalsData.services += (val) ? 1 : 0;
              break;
            case 'shielding':
            case 'waf':
            case 'edge-compute':
              totalsData[`${key}s`] += (val) ? 1 : 0;
              break;
            default:
              throw new Error(`Unknown key (${key})`);
          }
        }
      }
    })
  });
  console.log('Table update - setting totals')
  // Display totals
  setTotals(totalsData);

  console.log('Table update done')  
  //disableControlsWhileGettingData(false);
}


function updateTotals(rowData = null) { /* OK */
  const tableType = 'totals', idTbl = `service-${tableType}`, bResetData = (rowData == null), totalsData = {}, altKeys = {};
  if (bResetData) rowData = {};
  appCfg.data.filter(datum => !('table' in datum) || datum.table == tableType).forEach( datum => {
    altKeys[datum.name] = ('alt-key' in datum) ? datum['alt-key'] : datum.name;
    let tmpDefault = ('default' in datum) ? datum.default : 0;
    let hasAverage = ('average' in datum && datum.average);
    let hasAdjust = ('adjust' in datum && datum.adjust);
    if (!hasAverage) {
      totalsData[datum.name] = {selector:`#${idTbl} tbody tr td.${datum.name}`};
      if (bResetData) {
        rowData[altKeys[datum.name]] = tmpDefault;
        if (hasAdjust) rowData[`${altKeys[datum.name]}-adjusted`] = tmpDefault;
      }
    } else {
      altKeys[`average-${datum.name}`] = altKeys[datum.name];
      totalsData[datum.name] = {selector:`#${idTbl} tbody tr td.${datum.name}.non-average`};
      totalsData[`average-${datum.name}`] = {selector:`#${idTbl} tbody tr td.${datum.name}.average`};
      if (bResetData) {
        rowData[altKeys[datum.name]] = tmpDefault;
        rowData[altKeys[`average-${datum.name}`]] = tmpDefault;
        if (hasAdjust) {
          rowData[`${altKeys[datum.name]}-adjusted`] = tmpDefault;
          rowData[`${altKeys[`average-${datum.name}`]}-adjusted`] = tmpDefault;
        }
      }
    }
    if ('formats' in datum) {
      if (!datum.formats.startsWith('integer')) throw new Error(`formats for name="${datum.name}" expected to start with "integer" and does not: "${datum.formats}"`);
      totalsData[datum.name].selector += ' span.integer';
      totalsData[datum.name].formats = datum.formats;
      if (hasAverage) {
        totalsData[`average-${datum.name}`].selector += ' span.integer';
        totalsData[`average-${datum.name}`].formats = datum.formats;
      }
    }
  });
  Object.keys(totalsData).forEach( key => {
    let selector = totalsData[key].selector;
    if ($(selector).length != 1) throw new Error(`bad selector: "${selector}" (${$(selector).length})`);
    let tmpName = (`${altKeys[key]}-adjusted` in rowData) ? `${altKeys[key]}-adjusted` : altKeys[key];
    let incVal = rowData[tmpName];
    if (typeof d == "boolean") incVal = (incVal) ? 1 : 0;
    let oldVal = parseInt($(selector).text()), newVal = incVal + ((bResetData) ? 0 : oldVal);
    if (!selector.endsWith('.integer')) {
      $(selector).text(newVal);
    } else {
      selector = selector.replace(/\.integer$/,'');
      totalsData[key].formats.split(',').forEach( formatType => {
        $(`${selector}.${formatType}`).text( formatBytes(formatType,newVal) );
      });
    }
  });
}

function addDataTableRow(tableType, rowData = null) { /* OK */
  let idTbl = `service-${tableType}`;
  $(`#${idTbl} tbody`).append($('<tr>'));
  switch(tableType) {
    case 'totals':
      if (rowData == null) {
        rowData = {};
        appCfg.data.filter(datum => !('table' in datum) || datum.table == tableType).forEach( datum => {
          rowData[datum.name] = ('default' in datum) ? datum.default : 0;
          if ('average' in datum && datum.average) rowData[`average-${datum.name}`] = ('default' in datum) ? datum.default : 0;
        });
      }
      break;
    case 'data':
      if (rowData == null) rowData = serviceData[serviceData.length - 1];
      $(`#${idTbl} tbody tr:last-of-type`).addClass(`row${rowData.row}`);
      break;
    default:
      throw new Error(`Unknown tableType "${tableType}"`)
  }
  
  appCfg.data.forEach( datum => {
    let processDatum = true;
    if ('table' in datum) processDatum = (datum.table == tableType);
    if (processDatum) {
      let tmpClass = `th-td category-${('category' in datum) ? datum.category.replace(/ /g,'-').toLowerCase() : 'default'}`;
      switch(datum.name) {
        case 'select-service':
          $(`#${idTbl} tbody tr:last-of-type`).append($('<td>',{'has-waf':rowData.waf, class: tmpClass}));
          $(`#${idTbl} tbody tr:last-of-type td`).append($('<input>',{type:'checkbox',class:datum.name,checked:rowData['selected'],disabled:true}));
          $(`#${idTbl} tbody tr:last-of-type td input`).click(function() { updateSelectedServices(this); });
          break;
        default:

          $(`#${idTbl} tbody tr:last-of-type`).append($('<td>',{class:`${tmpClass} ${datum.name}${(datum.dataType)?` ${datum.dataType}`:''}`,key:datum.name}));
          let lastTd = $(`#${idTbl} tbody tr:last-of-type td:last-of-type`);
          
          // tmpName added to support adjusting bandwidth
          let tmpName = `${datum.name}${(tableType == 'data' && 'adjust' in datum && datum.adjust) ? '-adjusted' : ''}`;
          
          if (rowData[tmpName] === undefined) {
            rowData[tmpName] = 0;
            console.log(`${tableType} / ${tmpName} - ${rowData[tmpName]} (${typeof rowData[tmpName]})`);
          }
          
          if (! datum.formats) {
            if (typeof rowData[tmpName] != 'boolean')
              lastTd.text(rowData[tmpName]);
            else 
              lastTd.text(rowData[tmpName] ? 'X' : '').addClass(rowData[tmpName] ? 'yes' : 'no');
          } else {
            datum.formats.split(',').forEach(format => {
              lastTd.append($('<span>',{class:format}));
              lastTd.children().last().text(formatBytes(format,rowData[tmpName]));
            });
          }
          if (datum.average) {
            lastTd.addClass('non-average').clone().appendTo(lastTd.parent());
            lastTd = lastTd.next();
            lastTd.removeClass('non-average').addClass('average').attr('key',`average-${tmpName}`);
            if (apiData.average_divisor != 1) {
              if (! datum.formats) {
                lastTd.text(rowData[`average-${tmpName}`]);
              } else {
                datum.formats.split(',').forEach(format => {
                  lastTd.find(`.${format}`).text(formatBytes(format,rowData[`average-${tmpName}`]));
                });
              }
            }
          }
      }
    }
  });
  
  if (tableType == 'data') updateTotals(rowData);
}

function addDataSortLinks(tblSelector) { /* OK */
  let colJquery = $( `${tblSelector} thead th[sort-field]` ).append($('<span>',{class:'text-nowrap'}));
  ['asc','desc'].forEach(sortDirection => {
    colJquery.find('span').each(function() {
      $( this ).append($('<a>', {class:'sort-link', 'sort-direction': sortDirection}));
    });
    colJquery.find(`span a[sort-direction=${sortDirection}]` ).each(function() {
      $( this ).html('&#8679;').prop('title',`Sort column data in ${sortDirection}ending order`);
    });
  });
  colJquery.find('a.sort-link').each(function() {
    $( this ).click(function(){
      sortTableData(this.parentElement.parentElement.getAttribute('sort-field'),this.getAttribute('sort-direction'));
    });
  });
}

function createDataTables() { /* OK */
  ["totals","data"].forEach( tableType => {
    let idTbl = `service-${tableType}`;
    $(`#${idTbl}`).append('<thead>').append('<tbody>');
    $(`#${idTbl} thead`).addClass('thead-darkish').append('<tr>');
    appCfg.data.forEach( datum => {
      let processDatum = true;
      if ('table' in datum) processDatum = datum.table == tableType;
      if (processDatum) {
        let tmpClass = `th-td category-${('category' in datum) ? datum.category.replace(/ /g,'-').toLowerCase() : 'default'}`, attributes = {class:tmpClass};
        switch(datum.name) {
          case 'select-service':
            $(`#${idTbl} thead tr`).append($('<th>',attributes));
            $(`#${idTbl} thead tr th:last-of-type`).append($('<input>',{type:'checkbox',value:'',checked:'',class:datum.name}));
            break;
          default:
            if (!datum.noSort) attributes['sort-field'] = `${datum.name}${(datum.average)?'.non-average':''}`;
            $(`#${idTbl} thead tr`).append($('<th>',attributes));
            $(`#${idTbl} thead tr th:last-of-type`).text(datum.title);
            if (datum.average) {
              $(`#${idTbl} thead tr th:last-of-type`).addClass('non-average').clone().appendTo(`#${idTbl} thead tr`);
              $(`#${idTbl} thead tr th:last-of-type`).text(`Ave ${datum.title}`).removeClass('non-average').addClass('average');
            }
        }
      }
    });
    $(`#${idTbl} thead tr th`).attr('scope','col');
    switch(tableType) {
      case 'totals':
        addDataTableRow(tableType);
        break;
      case 'data':
        addDataSortLinks(`#${idTbl}`);
        break;
    }
  });
}

function getRowIndex(e) {
  let c = $( e ).parents('tr');
  if (c.length != 1) throw new Error(`Issues finding parental TR (${c.length})`);
  let classList = c.attr('class');
  if (!classList.startsWith('row')) throw new Error(`Issues finding class of parental TR (${classList})`);
  let rowIndex = parseInt(classList.replace('row',''));
  if (isNaN(rowIndex))  throw new Error(`Issues getting row index (${classList.replace('row','')})`);
  return rowIndex;
}

var debug = { /* OK */
  dumpData: function() { console.log(JSON.stringify(serviceData,null,'  ')); },
  load: function(a = null,s) {
    if (a == null) {
      $('#customerId').focus();
    } else {
      $('#apiKey').val(a).change();
      $('#serviceId').focus().val(s).change();
    }
    $('#get-data').click();
  },
  services: {
    status: function() {
      var total = $('#service-data tbody tr').length,
          shown = $('#service-data tbody tr:not(.hidden)').length,
          hidden = $('#service-data tbody tr.hidden').length;
      console.log(`Services - Total: ${total}, Shown: ${shown}, Hidden: ${hidden}`); 
    },
    showAll: function() {
      $('#service-data tbody tr.hidden').removeClass('hidden');
      this.status();
    },
    hideUnchecked: function() {
      $('#service-data tbody tr input:not(:checked)').each( function(i){
        $( this ).parent().parent().attr('class',`${$( this ).parent().parent().attr('class')} hidden`);
      });
      this.status();
    },
    hideChecked: function() {
      $('#service-data tbody tr input:checked').each( function(i){
        $( this ).parent().parent().attr('class',`${$( this ).parent().parent().attr('class')} hidden`);
      });
      this.status();
    }
  }
}

function test() {
  function quote(t) {
    let n = Number(t);
    return (t == '' || isNaN(n)) ? `"${t.replace(/"/g,'""')}"` : n;
  }
  let data = {totals:[],services:[]}, csv = {totals:[],services:[]};
  
  data.totals.push([]);
  $('#service-totals thead tr th').each(function(){
    data.totals[data.totals.length -1].push($(this).text());
  });
  $('#service-totals tbody tr').each(function(){
    data.totals.push([]);
    $(this).find('td').each(function(){
      data.totals[data.totals.length -1].push(($(this).children().length == 0) ? $(this).text() : $(this).find('span.integer').text());
    });
  });
  
  data.services.push([]);
  $('#service-data thead tr th:not(:first-of-type)').each(function(){
    data.services[data.services.length -1].push($(this).text().replace(/⇧/g,''));
  });
  $('#service-data tbody tr').each(function(){
    data.services.push([]);
    $(this).find('td:not(:first-of-type)').each(function(){
      data.services[data.services.length -1].push(($(this).children().length == 0) ? $(this).text() : $(this).find('span.integer').text());
    });
  });
  
  data.totals.forEach(row => csv.totals.push(row.map(item => quote(item)).join(',')));
  data.services.forEach(row => csv.services.push(row.map(item => quote(item)).join(',')));
  
  console.log(JSON.stringify(data,null,'  '))
  console.log(JSON.stringify(csv,null,'  '))
}