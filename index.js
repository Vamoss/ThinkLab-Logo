var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

class Client {
  constructor(socket) {
    this.socket = socket;
    this.ID = Date.now() + String(Math.random()).substr(2, 13);
    this.playing = false;
  }

  getPlayingTime() {
  	return Math.floor((Date.now() - this.time)/1000);
  }

  isPlaying(){
  	return this.playing;
  }

  play(){
	this.playing = true;
	this.time = Date.now();
	this.socket.emit('start');
  }

  stop(){
	this.playing = false;
	this.socket.emit('finish');
  }
}

let queue = [];
let master;
let SESSION_TIME = 30;

io.on('connection', function(socket){

  console.log('a user connected');
  socket.emit('connect');

  socket.on('master', function(){
  	console.log('a user is a master');
  	master = socket;

  	socket.on('disconnect', function(){
	  master = undefined;
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
	    	if(master) master.emit('spikes', val);
	  });
	  socket.on('length', function(val){
	  	if(client.isPlaying())
	    	if(master) master.emit('length', val);
	  });
	  socket.on('phase', function(val){
	  	if(client.isPlaying())
	    	if(master) master.emit('phase', val);
	  });
	  socket.on('radius', function(val){
	  	if(client.isPlaying())
	    	if(master) master.emit('radius', val);
	  });
	  socket.on('outterRadius', function(val){
	  	if(client.isPlaying())
	    	if(master) master.emit('outterRadius', val);
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

		let playingTime = queue[0].getPlayingTime();
		if(playingTime > SESSION_TIME){
			queue[0].stop();
			queue.push(queue.shift());
			update();
			return;
		}

		let remainingTime = SESSION_TIME - playingTime;

		for(var i = 1; i < queue.length; i++){
			queue[i].socket.emit('time', (i-1) * (SESSION_TIME+1) + remainingTime);
		}
	}
}

setInterval(update, 1002);