"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("http");
http.createServer(function (request, response) {
    response.write('Hello from Node.js!');
    response.end();
}).listen(3000);
//# sourceMappingURL=index.js.map