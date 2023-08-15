/*

appCfg.data Notes:

 * define in display order
 * "name" assumed to be unique - duplicate at your own risk
 * if "table" not specified, all tables assumed
 * if "default" not specified, 0 assumed
 * if "average" is true, an "average-..." field is created
 * if "formats" is specified, a subfield for each format is created
 
 */
const appCfgData = [
  {
    name: "services",
    title: "Services Selected",
    table: "totals",
    "alt-key": "selected"
  },
  {
    name: "select-service",
    table: "data",
    default: null
  },
  {
    name: "service-id",
    title: "Service",
    table: "data",
    default: ""
  },
  {
    name: "service-name",
    title: "Service Name",
    table: "data",
    default: ""
  },
  {
    name: "service-type",
    title: "Type",
    table: "data",
    default: ""
  },
  {
    name: "total-requests",
    title: "Total Requests",
    formats: "integer,comma-separated",
    dataType: "requests",
    average: true,
    stats: 'requests',
    category: 'Delivery'
  },
  {
    name: "delivered-bandwidth",
    title: "Delivered BW",
    formats: "integer,abbreviated,comma-separated",
    dataType: "bytes",
    average: true,
    stats: 'bandwidth',
    category: 'Delivery'
  },
 /* 
  {
    name: "hits",
    title: "Hits",
    formats: "integer,comma-separated",
    dataType: "requests",
    average: true,
    stats: 'hits',
    category: 'Hit-Miss-Pass'
  },
  {
    name: "misses",
    title: "Misses",
    formats: "integer,comma-separated",
    dataType: "requests",
    average: true,
    stats: 'miss',
    category: 'Hit-Miss-Pass'
  },
  {
    name: "passes",
    title: "Passes",
    formats: "integer,comma-separated",
    dataType: "requests",
    average: true,
    stats: 'pass',
    category: 'Hit-Miss-Pass'
  },
  {
    name: "hit-ratio",
    title: "Cache Hit Ratio",
    //formats: "integer,abbreviated,comma-separated",
    dataType: "bytes",
    average: true,
    stats: 'hit_ratio',
    category: 'Delivery'
  },
*/
  {
    name: "origin-fetches",
    title: "Origin Requests",
    formats: "integer,comma-separated",
    dataType: "requests",
    average: true,
    stats: 'origin_fetches',
    category: 'Origin'
  },
  {
    name: "origin-fetch-bandwidth",
    title: "Origin Request BW",
    formats: "integer,abbreviated,comma-separated",
    dataType: "bytes",
    average: true,
    stats: 'origin_fetch_header_bytes,origin_fetch_body_bytes',
    category: 'Origin'
    // 'hit, hit, miss,+,/'
  },
  {
    name: "origin-fetch-resp-bandwidth",
    title: "Origin Response BW",
    formats: "integer,abbreviated,comma-separated",
    dataType: "bytes",
    average: true,
    stats: 'origin_fetch_resp_header_bytes,origin_fetch_resp_body_bytes',
    category: 'Origin'
  },
  {
    name: "origin-rps",
    title: "Origin RPS",
    //formats: "integer,comma-separated",
    //dataType: "requests",
    //average: true,
    stats: 'origin_fetches',
    category: 'Origin'
  },
  {
    name: "restarts",
    title: "Restarts",
    stats: 'restarts',
    category: 'Origin'
  },
  {
    name: "adjusted-origin-rps",
    title: "Origin RPS w/o Restarts",
    stats: 'origin_fetches,restarts',
    category: 'Origin'
  },
  {
    name: "backend-bandwidth",
    title: "Backend Request BW",
    formats: "integer,abbreviated,comma-separated",
    dataType: "bytes",
    average: true,
    adjust: true,
    stats: 'bereq_header_bytes,bereq_body_bytes',
    category: 'Backend'
  },
  /**/
  {
    name: "compute-requests",
    title: "Edge Compute Requests",
    formats: "integer,comma-separated",
    dataType: "requests",
    average: true,
    stats: 'compute_requests',
    category: 'Edge Compute'
  },
  {
    name: "compute-time",
    title: "Edge Compute Request Time",
    //formats: "integer,comma-separated",
    //dataType: "requests",
    average: true,
    stats: 'compute_request_time_ms',
    category: 'Edge Compute'
  },
  {
    name: "io-responses",
    title: "IO Responses",
    formats: "integer,comma-separated",
    dataType: "requests",
    average: true,
    stats: 'imgopto',
    select: "usage",
    category: 'Edge Optimization'
  },
  {
    name: "io-resp-bandwidth",
    title: "IO Response BW",
    formats: "integer,abbreviated,comma-separated",
    dataType: "bytes",
    average: true,
    stats: 'imgopto_resp_header_bytes,imgopto_resp_body_bytes',
    category: 'Edge Optimization'
  },
  {
    name: "video-responses",
    title: "Video Responses",
    formats: "integer,comma-separated",
    dataType: "requests",
    average: true,
    stats: 'video',
    select: "usage",
    category: 'Edge Optimization'
  },
  {
    name: "otfp-responses",
    title: "OTFP Responses",
    formats: "integer,comma-separated",
    dataType: "requests",
    average: true,
    stats: 'otfp',
    select: "usage",
    category: 'Edge Optimization'
  },
  /**/
  {
    name: "shielding",
    title: "Shielding",
    table: "data",
    default: false,
    source: 'If a shield is specified for any of the backends in the Service\'s active configuration',
    select: "boolean",
    category: 'Shielding'
  },
  {
    name: "shieldings",
    title: "Shielding Count",
    table: "totals",
    "alt-key": "shielding",
    category: 'Shielding'
  },
  /* LOG STATS for REX */
  {
    name: "log-lines",
    title: "Log Lines",
    formats: "integer,comma-separated",
    dataType: "requests",
    average: true,
    stats: 'log',
    category: 'Log'
  },
  {
    name: "log-bytes",
    title: "Log Bytes",
    formats: "integer,abbreviated,comma-separated",
    dataType: "bytes",
    average: true,
    stats: 'log_bytes',
    category: 'Log'
  },
  /* LOG STATS for REX */
  {
    name: "waf",
    title: "Fastly WAF",
    table: "data",
    default: false,
    source: 'If a Fastly WAF object is defined in the Service\'s active configuration',
    select: "boolean",
    category: 'Fastly WAF'
  },
  {
    name: "wafs",
    title: "Fastly WAF Count",
    table: "totals",
    "alt-key": "waf",
    category: 'Fastly WAF'
  },
  {
    name: "edge-compute",
    title: "C@E",
    table: "data",
    default: false,
    source: 'If there is a WASM package in the Service\'s active configuration',
    select: "boolean",
    category: 'Edge Compute'
  },
  {
    name: "edge-computes",
    title: "C@E Count",
    table: "totals",
    "alt-key": "edge-compute",
    category: 'Edge Compute'
  },
];