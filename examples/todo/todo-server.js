#!/usr/bin/env node

var jet = require('../../lib/jet');
var finalhandler = require('finalhandler')
var http = require('http')
var serveStatic = require('serve-static')

var port = parseInt(process.argv[2]) || 80;

// Serve this dir as static content 
var serve = serveStatic('./');

// Create Webserver 
var httpServer = http.createServer(function (req, res) {
	var done = finalhandler(req, res)
	serve(req, res, done)
})

httpServer.listen(port);

// Create Jet Daemon
var daemon = new jet.Daemon();
daemon.listen({
	server: httpServer // embed jet websocket upgrade handler
});

// Declare Todo Class
var todoId = 0;

var Todo = function (title) {
	this.id = todoId++;
	this.title = title;
	this.completed = false;
};

Todo.prototype.merge = function (other) {
	if (other.completed !== undefined) {
		this.completed = other.completed;
	}

	if (other.title !== undefined) {
		this.title = other.title;
	}
};

// Create Jet Peer
var peer = new jet.Peer({
	url: 'ws://localhost:' + port
});

var todoStates = {};

// Provide a "todo/add" method to create new todos
peer.method({
	path: 'todo/add',
	call: function (title) {
		var todo = new Todo(title);

		// create a new todo state and store ref.
		todoStates[todo.id] = peer.state({
			path: 'todo/#' + todo.id,
			value: todo,
			set: function (requestedTodo) {
				todo.merge(requestedTodo);
				return {
					value: todo
				};
			}
		});
	}
});


// Provide a "todo/remove" method to either delete one or all todos
peer.method({
	path: 'todo/remove',
	call: function (todoId) {
		if (typeof todoId === 'undefined') {
			for (var id in todos) {
				todoStates[id].remove();
				delete todoStates[id];
			}

		} else {
			todoStates[todoId].remove();
			delete todoStates[todoId];
		}
	}
});