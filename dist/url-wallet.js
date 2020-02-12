var UrlWallet =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/url-wallet.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/provider-bridge.js":
/*!********************************!*\
  !*** ./src/provider-bridge.js ***!
  \********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\nclass ProviderBridge {\n  // maybe adopt to a JSON RPC library?\n  constructor(provider, port, extensionPort) {\n    this.provider = provider\n    this.port = port\n    this.methodMap = new Map([\n      ['send', this.send],\n      ['currentAddress', this.getCurrentAddress],\n    ])\n    this.sendRoutingMap = new Map([\n      // ['sendTransaction', this._signAndSendRawTransaction],\n    ])\n    this.queue = new Map()\n    this.onqueuechange = null\n\n    this.currentAddress = null\n\n    this._incomingHandler = this._handleRpc.bind(this)\n    this._outgoingHandler = this._handleNotif.bind(this)\n    \n    if (this.provider.sendAsync) {\n      // MetaMask is NOT EIP-1193 compliant as of 2019/11/20\n      console.warn('The provider is probably not EIP-1193 compliant. ' +\n        'Will send with legacy, callback-based method \"sendAsync\".')\n      this.sendAsync = this._sendAsyncLegacy\n    } else {\n      this.sendAsync = this._sendAsync\n    }\n  }\n\n  bindSubscriptionEvents(target) {\n    let providerEmitter = null\n    if (target) {\n      providerEmitter = target\n    } else {\n      // auto-detect\n      providerEmitter = this.provider\n      if (this.provider.host == 'CustomProvider') {\n        providerEmitter = this.provider.connection\n      }\n    }\n\n    if (providerEmitter && providerEmitter.on) {\n      // if MetaMask were EIP-1193-compliant...\n      // this.provider.on('notification', this.outgoingHandler)\n      providerEmitter.on('data', (err, result) => {\n        if (err) throw err\n        return this._outgoingHandler(result)\n      })\n      return true\n    } else {\n      return false\n    }\n  }\n\n  _queueChange(entry, removed) {\n    if (this.onqueuechange) {\n      if (removed) {\n        this.onqueuechange(entry, null, this.queue)\n      } else {\n        const newValue = this.queue.get(entry)\n        this.onqueuechange(entry, newValue, this.queue)\n      }\n    }\n  }\n\n  _handleRpc(msgevt) {\n    const {method} = msgevt.data\n    if (method == undefined) {\n      console.error('No method provided')\n      return\n    }\n\n    const handler = this.methodMap.get(method)\n    if (handler == undefined) {\n      console.error(`No such method \"${method}\".`)\n      return\n    }\n\n    let desc = method\n    if (method == 'send') {\n      desc += ` \"${msgevt.data.payload.method}\"`\n    }\n    const ident = Symbol(desc)\n    this.queue.set(ident, 'pending')\n    this._queueChange(ident, false)\n\n    const {nonce, payload} = msgevt.data\n\n    return (handler.bind(this))(payload)\n      .then(response => {\n        this.port.postMessage({ nonce, response })\n        this.queue.set(ident, 'resolved')\n        this._queueChange(ident, false)\n      })\n      .catch(error => {\n        this.port.postMessage({ nonce, error })\n        this.queue.set(ident, 'rejected')\n        this._queueChange(ident, false)\n      })\n  }\n\n  _handleNotif(notif) {\n    // notif is a JSON-RPC response notification\n    this.port.postMessage({ notification: notif })\n  }\n\n  send(payload) {\n    if (typeof payload === 'string') {\n      return Promise.reject(new Error('Invalid JSON-RPC request. ' +\n        'send() only allows an object as its payload.'))\n    }\n\n    console.log('MyRPC forwarding \"send\":', payload)\n\n    if (this.sendRoutingMap.has(payload.method)) {\n      return this.sendRoutingMap.get(payload.method)(payload)\n    }\n    return this.sendAsync(payload)\n  }\n\n  _sendAsyncLegacy(payload) {\n    return new Promise((resolve, reject) => {\n      this.provider.sendAsync(payload, (error, response) => {\n        if (error != null) {\n          reject(error)\n        } else {\n          resolve(response.result)\n        }\n      })\n    })\n  }\n\n  _sendAsync(payload) {\n    if (this.provider.sendPayload) {\n      payload.jsonrpc = '2.0'\n      payload.id = 1\n      return this.provider.sendPayload(payload).then(x => {\n        if (x.error) {\n          throw x.error\n        }\n        return x.result\n      })\n    }\n    return this.provider.send(payload.method, payload.param)\n  }\n\n  getCurrentAddress() {\n    // injected web3 has a selectedAddress as default\n    if ('selectedAddress' in this.provider) {\n      return Promise.resolve([this.provider.selectedAddress])\n    }\n    return Promise.resolve([this.currentAddress])\n  }\n\n  // _sendTransactionMiddleware(params) {\n  //   if (params[0].gas == null) {\n  //     console.warn('Not specifying gas limit, auto-calculated...')\n  //     // TODO: estimate gas\n  //     params[0].gas = 21000\n  //   }\n  // }\n}\n\n/* harmony default export */ __webpack_exports__[\"default\"] = (ProviderBridge);\n\n\n//# sourceURL=webpack://UrlWallet/./src/provider-bridge.js?");

/***/ }),

/***/ "./src/url-wallet.js":
/*!***************************!*\
  !*** ./src/url-wallet.js ***!
  \***************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _provider_bridge__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./provider-bridge */ \"./src/provider-bridge.js\");\n\n\nclass UrlWallet {\n  constructor() {\n    this.handshaked = null\n    this.bridge = null\n    this.respondToHandshake = this._respondToHandshake.bind(this)\n    this.postMessageHandler = this._postMessageHandler.bind(this)\n    this.openWindowFromDapp = this._openWindowFromDapp.bind(this)\n    this.openWindowFromIframe = this._openWindowFromIframe.bind(this)\n  }\n\n  _openWindowFromDapp(url) {\n    this.bridge.port.postMessage({ url: location.origin + '/' + url })\n  }\n\n  _openWindowFromIframe(url) {\n    const newWindow = window.open(url)\n    if (!newWindow || newWindow.closed || newWindow.closed === undefined) {\n      this.bridge.port.postMessage({ windowBlocked: true })\n      return false\n    }\n\n    return true\n  }\n\n  _respondToHandshake(port, error) {\n    if (error == null) {\n      port.onmessage = this.bridge._incomingHandler\n      port.postMessage({ok: true, msg: 'handshake ACK'})\n    } else {\n      // act like if the connection were closed\n      port.onmessage = () => {}\n      port.postMessage({ok: false, msg: 'handshake failed', error: error})\n    }\n  }\n\n  _postMessageHandler(evt) {\n    if (!evt.origin) {\n      return\n    }\n    if (location.origin == evt.origin) {\n      console.debug('Ignoring self-calling message')\n      return\n    }\n\n    console.log('iframe onmessage', evt.data, 'from', evt.origin, evt)\n\n    // drop all non-handshaking events\n    if (evt.data.method == 'handshake') {\n      if (this.handshaked) {\n        console.warn('Repeated handshake to iframe! Ignoring...')\n        return\n      }\n      this.handshaked = true\n\n      this.bridge = new _provider_bridge__WEBPACK_IMPORTED_MODULE_0__[\"default\"](web3.currentProvider, evt.ports[0])\n      this.respondToHandshake(evt.ports[0], null)\n\n      window.postMessage({ 'method': 'handshakeDone' }, location.origin)\n    } else {\n      console.error(evt)\n    }\n  }\n}\n\n/* harmony default export */ __webpack_exports__[\"default\"] = (UrlWallet);\n\n\n//# sourceURL=webpack://UrlWallet/./src/url-wallet.js?");

/***/ })

/******/ })["default"];