var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

function Client (socket) {
	this.socket = socket;
	this.ID = Date.now() + String(Math.random()).substr(2, 13);
	this.playing = false;
}

Client.prototype.getPlayingTime = function() {
	return Math.floor((Date.now() - this.time)/1000);
}

Client.prototype.isPlaying = function(){
  	return this.playing;
}

Client.prototype.play = function(){
	this.playing = true;
	this.time = Date.now();
	this.socket.emit('start');
}

Client.prototype.stop = function(){
	this.playing = false;
	this.socket.emit('finish');
}

function Master (socket) {
	this.socket = socket;
	this.ID = Date.now() + String(Math.random()).substr(2, 13);
}

function sendToMaster(event, val){
	for(var i = 0; i < masters.length; i++){
		masters[i].socket.emit(event, val);
	}
}

var queue = [];
var masters = [];
var SESSION_TIME = 30;

io.on('connection', function(socket){

  console.log('a user connected');
  socket.emit('connect');

  socket.on('master', function(){
  	console.log('a user is a master');
  	var master = new Master(socket);
  	masters.push(master);

  	socket.on('disconnect', function(){
		for(var i = masters.length-1; i >= 0; i--){
			if(master.ID == masters[i].ID){
				masters.splice(i, 1);
			}
		}
	});
  });

  socket.on('client', function(){
  	console.log('a user is a client');
	  var client = new Client(socket);
	  queue.push(client);

	  socket.on('disconnect', function(){
	    console.log('user disconnected');
	    //remove from queue
		for(var i = queue.length-1; i >= 0; i--){
			if(client.ID == queue[i].ID){
				if(queue[i].isPlaying())
					queue[i].stop();
				queue.splice(i, 1);
			}
		}
	  });
	  socket.on('spikes', function(val){
	  	if(client.isPlaying())
	    	sendToMaster('spikes', val);
	  });
	  socket.on('length', function(val){
	  	if(client.isPlaying())
	    	sendToMaster('length', val);
	  });
	  socket.on('phase', function(val){
	  	if(client.isPlaying())
	    	sendToMaster('phase', val);
	  });
	  socket.on('radius', function(val){
	  	if(client.isPlaying())
	    	sendToMaster('radius', val);
	  });
	  socket.on('outterRadius', function(val){
	  	if(client.isPlaying())
	    	sendToMaster('outterRadius', val);
	  });
  });
});

app.use(express.static(__dirname + "/public"));
http.listen(3000, function(){
  console.log('listening on *:3000');
});

function update(){
	if(queue.length>0){
		if(!queue[0].isPlaying())
			queue[0].play();

		var playingTime = queue[0].getPlayingTime();
		if(playingTime > SESSION_TIME){
			queue[0].stop();
			queue.push(queue.shift());
			update();
			return;
		}

		var remainingTime = SESSION_TIME - playingTime;

		for(var i = 1; i < queue.length; i++){
			queue[i].socket.emit('time', (i-1) * (SESSION_TIME+1) + remainingTime);
		}
	}
}

setInterval(update, 1002);