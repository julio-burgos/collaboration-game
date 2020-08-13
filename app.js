var port = process.env.PORT||3000 ;
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

io.set('heartbeat timeout',4000);
io.set('heartbeat interval',2000);


server.listen(port);

app.use(express.static(__dirname + '/public'));
var users_type = [];
var users_id = [];

const T1 = 10.0;
const T2 = 90.0;

//El rango de C1 y C2 es [1,100]
var C1 = 1.0;
var C2 = 1.0;

var objective = get_new_random_objective();

var CA = calc_CA();
var TA = calc_TA();


function calc_CA(){

    var c = C1+C2;

    if( Math.abs(c-objective.C) < 0.7 ){
       c =  objective.C;
    }

    return c;
}
function calc_TA(){

    var t = (T1*C1+T2*C2)/(C1+C2+0.01);

    if( Math.abs(t-objective.T) < 0.7 ){
       t =  objective.T;
    }

    return t;
}

function randomNumber(minimum, maximum){
    return Math.round( Math.random() * (maximum - minimum) + minimum);
}
function get_new_random_objective(){
    var temperature = randomNumber(T1+1,T2);
    var flow = randomNumber(30,100);
    var C2O = ( temperature*flow - flow*T1)/(T2-T1);
    var C1O = flow-C2O;
    var result = {    
        T: temperature,
        C: flow,
        C1: C1O,
        C2: C2O
    };
    return result;
}


function send_objective(){
    var data = {
                objective : objective,
                T1 : T1,
                T2 : T2,
                C1 : C1,
                C2 : C2,
                CA : CA,
                TA : TA
            };
    io.emit('objective',data);
}



app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/client1', function(req, res){
  res.sendFile(__dirname + '/public/client1.html');
});
app.get('/client2', function(req, res){
  res.sendFile(__dirname + '/public/client2.html');
});
app.get('/admin', function(req, res){
  res.sendFile(__dirname + '/public/admin.html');
});

io.sockets.on('connection',function(socket){
    
    //console.log('Connected ID: '+socket.id);
    
    socket.on('new index',function(){
        io.emit('new state',users_type);
    });


    socket.on('new objective',function(data, callback){
        objective = get_new_random_objective();
        //sends new objectives to ALL clients
        send_objective();
    });
    socket.on('objective',function(data, callback){
        //sends objectives to ALL clients
        send_objective();
    });


    socket.on('new user', function(data, callback){
        if ( users_type.indexOf(data) == -1 ){
            callback(true);
            users_type.push( data );
            users_id.push( socket.id );
            io.emit('new state',users_type);


            
        }
        else{
            callback(false);
        }
    });

    socket.on('send message',function(data){
        
        if(data.typ=="C1") {C1= parseFloat(data.message);}
        if(data.typ=="C2") {C2= parseFloat(data.message);}
        CA = calc_CA();
        TA = calc_TA();
        var fulldata=[CA,TA,C1,C2];
        io.emit('new message',fulldata);
    });

    socket.on('disconnect', function() {
        //console.log('Disconnected ID: '+socket.id);
        var index = users_id.indexOf(socket.id);
        if( index != -1 )
        {   
            users_id.splice(index,1);
            users_type.splice(index,1);
            io.emit('new state',users_type);
        }
    });
    
    
});
