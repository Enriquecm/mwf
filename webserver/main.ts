/// <reference path='../typings/node/node.d.ts' />

/* Namespaces
 * ----------------------------------------------------- */
import APP   = require("./app");
import PATH  = require("path");
import UTILS = require("./libs/utils");
import WS    = require("./libs/webserver");

/* WebServer basic setup
 * ----------------------------------------------------- */
var websrv = new WS.WebServer();

websrv.setPort(8080);
websrv.setRoot(PATH.join(__dirname, "..", "webclient"));
websrv.setFavicon("/assets/favicon.ico");

/* Static routes
 * ----------------------------------------------------- */
if (UTILS.isDebug())
{
  websrv.addStaticRoute("/src/css/", "/css/");
  websrv.addStaticRoute("/src/html/", "/");
  websrv.addStaticRoute("/src/js/", "/js/");
  websrv.addStaticRoute("/src/html/index.html", "/");
}
else
{
  websrv.addStaticRoute("/min/css/", "/css/");
  websrv.addStaticRoute("/min/html/", "/");
  websrv.addStaticRoute("/min/js/", "/js/");
  websrv.addStaticRoute("/min/html/index.html", "/");
}

/* Start listening
 * ----------------------------------------------------- */
websrv.listen();