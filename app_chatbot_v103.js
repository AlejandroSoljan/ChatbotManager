/*script:app_chatbot*/
/*version:1.03*/

//var funciones = require('./funciones');
const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
var odbc = require("odbc");
const fetch = require('node-fetch');
//import fetch from "node-fetch";
//const { phoneNumberFormatter } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const { ClientInfo } = require('whatsapp-web.js/src/structures');
const utf8 = require('utf8');
const { OdbcError } = require('odbc');
const nodemailer = require('nodemailer');
const { eventNames } = require('process');

var a = 0;
var port = 8000
var headless = true;
var seg_desde = 80000;
var seg_hasta = 10000;
var seg_msg = 5000;
var version = "1.0";
var script = "__";
var telefono_qr = "0";
var telefono_local = "0";
var tel_array = [];
var ver_whatsapp = "0";
var dsn = "msm_manager";
var api = "http://managermsm.ddns.net:2002/v200/api/Api_Chat_Cab/ProcesarMensajePost";
//var l_cliente = "";
var msg_inicio = "";
var msg_fin = "";
var cant_lim = 0;
var msg_lim = 'Continuar? S / N';
var time_cad = 0;
var email_err = "";
var msg_cad = "";
var msg_can = "";
var bandera_msg = 1;
var jsonGlobal = [];   //1-json, 2 -i , 3-tel, 4-hora
var json;
var i_global = 0;
var msg_body;
var smtp;
var email_usuario;
var email_pas;
var email_puerto;
var email_saliente;
var msg_errores;
var nom_chatbot;




const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));


app.use(fileUpload({
  debug: false
}));

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});



RecuperarJsonConf();


const client = new Client({


  restartOnAuthFail: true,
  puppeteer: {
   headless: headless,
   
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ],
  },
  authStrategy: new LocalAuth()
});


///////////////////////////////////////////////////////////////////////////////////////////////////////
// FUNCION ENCARGADA DE DEVOLVER EL INDICE DE ARREGLO DONDE SE ENCUENTRA EL TELEFONO
// Y PODER RECUPERAR EL JSON ORIGINAL
///////////////////////////////////////////////////////////////////////////////////////////////////////


function indexOf2d(itemtofind) {
  var valor = -1
  console.table(jsonGlobal);

  for (var i = 0; i < jsonGlobal.length; i++) {
    
    if(jsonGlobal[i][0]==itemtofind){
      console.log('array '+jsonGlobal[i][0]);
      return i
    } else{

      valor = -1
    }
  }

  return valor


  //console.log('indice_a '+[].concat.apply([], ([].concat.apply([], myArray))).indexOf(itemtofind));
  //console.log('indice_b '+myArray.indexOf(itemtofind));
  //console.log('indice_c '+myArray(0).indexOf(itemtofind));
  //return [].concat.apply([], ([].concat.apply([], myArray))).indexOf(itemtofind) !== -1;
  //return [].concat.apply([], ([].concat.apply([], myArray))).indexOf(itemtofind) ;
 
  }





client.on('message', async message => {

  var indice_telefono = indexOf2d(message.from);

 if(indice_telefono == -1){

  var valor_i=0;
 }else{
 var valor_i = jsonGlobal[indice_telefono][1];
 }
 

  console.log("mensaje "+message.from);
  
 //if (message.from=='5493462541989@c.us' || message.from=='5493462231291@c.us'  || message.from=='5493462572554@c.us' ){

  
    
  if( valor_i==0) {
    
    RecuperarJsonConfMensajes();
   
    var segundos = Math.random() * (seg_hasta - seg_desde) + seg_desde;

   
    var telefonoTo = message.to;
    var telefonoFrom = message.from;
 
    telefonoTo = telefonoTo.replace('@c.us','');
    telefonoFrom = telefonoFrom.replace('@c.us','');
   
    var resp = null;
 

    if(telefonoFrom == 'status@broadcast'){
      console.log("mensaje de estado");
      return
    }
    if(message.type !== 'chat'){
      console.log("mensaje <> texto");
      return
    }
   
      //////////////////////////////////////////////////////////
      // MENSAJE DE ESPERO POR FAVOR
      ////////////////////////////////////////////////////////
      if (msg_inicio == ''|| msg_inicio == null){
      }
      else{
        client.sendMessage(message.from,msg_inicio );
      }

      await io.emit('message', 'Mensaje: '+message.from+': '+ message.body );
   
      var jsonTexto = {Tel_Origen:telefonoFrom,Tel_Destino:telefonoTo, Mensaje:message.body,Respuesta:''};

      let url =  api

      console.log(JSON.stringify(jsonTexto));
 
   try{
         
 
         resp = await fetch(url, {
           method: "POST",
           body: JSON.stringify(jsonTexto),
           headers: {"Content-type": "application/json; charset=UTF-8"}
         })
 
         .catch(err => console.log("err "+err))
      
         if (resp.ok  ) {
         
            tam_json = 0;
           json = await resp.json()

             /////////////////////////////////////////////////////////////////
             // RECUPERO DATOS DEL ARRAY GLOBAL  POR SI HAY CORTE DE MANSAJE
             ///////////////////////////////////////////////////////////////

             recuperar_json(message.from, json);
            
             ////ENVIO MENSAJES///
             await procesar_mensaje(json, message);

             ///////////////////////////////////////////
             /// MENSAJE DE FIN DE CONAULTA
             ////////////////////////////////////////////
             console.log('msg fin '+msg_fin)
             if (msg_fin == '' || msg_fin == null || msg_fin == undefined){
             }
             else{
              await client.sendMessage(message.from,msg_fin );
             }
          }
         else
         {
          json = await resp.json();
           
           if (msg_errores == ''|| msg_errores == null){

           }
           else{
            console.log("ApiWhatsapp - Response ERROR "+JSON.stringify(json));
            EnviarEmail('ApiWhatsapp - Response ERROR ',JSON.stringify(json));
            await client.sendMessage(message.from,msg_errores );
           }
           return 'error'
         }
     }
     catch (err) {
       console.log(err)
       if (msg_errores == ''|| msg_errores == null){
       }
       else{
        
        EnviarEmail('Chatbot Error ',err+" " +JSON.stringify(jsonTexto));
        await client.sendMessage(message.from,msg_errores );
       }
       return 'error'
     }
   
    };
   
    var body = message.body;
    body = body.trim();
    body = body.toUpperCase();


    if(valor_i !== 0 && body == 'N' ){
      console.log("cancelar"&msg_can);
      //client.sendMessage(message.from,'*Consulta Cancelada* ❌' );
            
      if(msg_can == '' || msg_can == undefined || msg_can == 0){
        
        
      }else{
        client.sendMessage(message.from,msg_can );

      }
      bandera_msg=1;
      jsonGlobal[indice_telefono][2] = '';
      jsonGlobal[indice_telefono][1] = 0;
      jsonGlobal[indice_telefono][3] = '';

    
    };
    if(valor_i!==0 && ((body != 'N') && (body != 'S' ) )){
      console.log("no entinedo ->"+message.body);
      client.sendMessage(message.from,'🤔 *No entiendo*, \nPor favor ingrese *S* o *N* para mostrar los siguientes resultados\n ' );

    };
    

    if(valor_i !== 0 && body == 'S'){
      console.log("continuar "+tam_json+' indice '+indice_telefono);
      procesar_mensaje(jsonGlobal[indice_telefono][2], message);

     }
 //}
});


client.initialize();
controlar_hora_msg();


/////////////////////////////////////////////////////////////
/// ENVIO DE LOG A APLICACION CLIENTE
//////////////////////////////////////////////////////////////
// Socket IO
io.on('connection', function(socket) {

  socket.emit('message', 'Conectando...');

  client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', 'Código QR Recibido...');
    });
  });

  client.on('ready', () => {
    console.log("listo...");
    //controlar_hora_msg();
    socket.emit('ready', 'Whatsapp Listo!');
    socket.emit('message', 'Whatsapp listo!');
    console.log("listo...");
       // jsonGlobal.push(['0',0,'0',''])
   // jsonGlobal[0][0]='1';
   // jsonGlobal[0][2]='1';
   // jsonGlobal[0][3]='1';
   // jsonGlobal[0][4]='1';
    
   // RecuperarJsonConf();
   // queryAccess();
  });

  client.on('authenticated', () => {
    socket.emit('authenticated', 'Whatsapp Autenticado!');
    socket.emit('message', 'Whatsapp Autenticado!');
    //EnviarEmail('Whatsapp Autenticado!'+client);
    console.log('Autenticado');
  });



  client.on('auth_failure', function(session) {
    socket.emit('message', 'Auth failure, restarting...');
    EnviarEmail('Chatbot error Auth failure','Auth failure, restarting...'+client);
  });

  client.on('disconnected', (reason) => {
    socket.emit('message', 'Whatsapp Desconectado!');
    EnviarEmail('Chatbot Desconectado ','Desconectando...'+client);
    client.destroy();
    client.initialize();
  });
});


const checkRegisteredNumber = async function(number) {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////                                                          ///////////////////////////////////////////
////////////////////                    FUNCIONES GENERALES                   ///////////////////////////////////////////
////////////////////                                                          ///////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


////////////////////////////////////////////////////////////////
// RECUPERA CONFIGURACION EN ARCHIVO JSON
///////////////////////////////////////////////////////////////

function RecuperarJsonConf(){
  
  const jsonConf =  JSON.parse(fs.readFileSync('configuracion.json'));
  console.log("configuracion.json "+jsonConf.configuracion);

   port = jsonConf.configuracion.puerto;
   console.log("puerto: "+port);
 
   headless = jsonConf.configuracion.headless;
   console.log("headless: "+headless);
   seg_desde = jsonConf.configuracion.seg_desde;
   console.log("seg_desde: "+seg_desde);
   seg_hasta = jsonConf.configuracion.seg_hasta;
   console.log("seg_hasta: "+seg_hasta);
   dsn = jsonConf.configuracion.dsn;
   console.log("dsn: "+dsn);
   seg_msg = jsonConf.configuracion.seg_msg;
   console.log("seg_msg: "+seg_msg);
   api = jsonConf.configuracion.api;
   console.log("api: "+api);
   msg_inicio = jsonConf.configuracion.msg_inicio
   console.log("msg_inicio: "+msg_inicio);
   msg_fin = jsonConf.configuracion.msg_fin
   console.log("msg_fin: "+msg_fin);
   if (headless == 'true'){
    headless = true
  }else
  {
    headless = false
  }

   const jsonPackage =  JSON.parse(fs.readFileSync('version.json'));
   console.log(jsonPackage)

   version = jsonPackage.version;
   console.log(version);
   script = jsonPackage.script;
   console.log(script);
   telefono_qr = jsonPackage.telefono;
  console.log(telefono_qr);


  server.listen(port, function() {
  console.log('App running on *: ' + port);
});

}

///////////////////////////////////////////////////////////////////////
// RECUPERA SOLO CONFIG DE MSG PARA NO TENER QUE REINICIAR SCRIPT ANTE UN CAMBIO
//////////////////////////////////////////////////////////////////////////////

function RecuperarJsonConfMensajes(){

  const jsonConf =  JSON.parse(fs.readFileSync('configuracion.json'));
  const jsonError = JSON.parse(fs.readFileSync('configuracion_errores.json'));
 // console.log("configuracion.json "+jsonConf);

   
   seg_desde = jsonConf.configuracion.seg_desde;
   seg_hasta = jsonConf.configuracion.seg_hasta;
   dsn = jsonConf.configuracion.dsn;
   seg_msg = jsonConf.configuracion.seg_msg;
   api = jsonConf.configuracion.api;
   msg_inicio = jsonConf.configuracion.msg_inicio;
   msg_fin = jsonConf.configuracion.msg_fin;
   cant_lim = jsonConf.configuracion.cant_lim;
   time_cad = jsonConf.configuracion.time_cad;
   email_err = jsonError.configuracion.email_err;
   msg_lim = jsonConf.configuracion.msg_lim;
   msg_cad = jsonConf.configuracion.msg_cad;
   msg_can = jsonConf.configuracion.msg_can;

   smtp = jsonError.configuracion.smtp;
   email_usuario = jsonError.configuracion.user;
   email_pas = jsonError.configuracion.pass;
   email_puerto = jsonError.configuracion.puerto;
   email_saliente = jsonError.configuracion.email_sal;
   msg_errores = jsonError.configuracion.msg_error;
   nom_chatbot= jsonConf.configuracion.nom_emp;


}


async function EnviarEmail(subjet,texto){

  texto = JSON.stringify(texto);
  console.log("email "+email_err);
  console.log("email2 "+subjet);
  console.log("email3 "+texto);

  subjet= nom_chatbot +" - "+subjet;
/*
  console.log("smtp "+smtp);
  console.log("email_puerto "+email_puerto);
  console.log("email_usuario "+email_usuario);
  console.log("email_pas "+email_pas);
  console.log("email_saliente "+email_saliente);
  */
  let testAccount = await nodemailer.createTestAccount();

  let transporter = nodemailer.createTransport({
    host: smtp,
    port: email_puerto,
    secure: false, // true for 465, false for other ports
    auth: {
      user: email_usuario, // generated ethereal user
      pass: email_pas, // generated ethereal password
    },
  });
  
  let info = await transporter.sendMail({
    from: email_saliente, // sender address
    to: email_err, // list of receivers
    subject: subjet, // Subject line
    text: texto, // plain text body
    html: texto, // html body
  });

  console.log("Message sent: %s", info.messageId);
  
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
 
}

////////////////////////////////////////////////////////////////////////////////////////////
//  FUNCION PARA MANTENER EL JSON GLOBAL CON LOS TELEFONOS Y MENSAJES QUE VAN INGRESANDO - FUNCION
//   NECESARIA PARA PODER LIMITAR LA CANTIDAD DE MENSAJES CONTINUOS A ENVIAR
////////////////////////////////////////////////////////////////////////////////////////////

function recuperar_json(a_telefono, json){

  var indice =indexOf2d(a_telefono);


  let now = new Date();
 
  if(indice !== -1){
   // console.log("ESTA "+a_telefono);
   
    jsonGlobal[indice][0] = a_telefono;
   // jsonGlobal[a_telefono,2] = 0;
    jsonGlobal[indice][2] = json;
    jsonGlobal[indice][3] = now;
    //console.table(jsonGlobal);
 }else{

    //console.log("NO ESTA "  +a_telefono);
     
  jsonGlobal.push([a_telefono,0,json,now])
    
      
 }


}

/////////////////////////////////////////////////////////////////////////////////////
// FUNCION DONDE SE PROCESA EL JSON GLOBAL DE MSG Y SE ENVIA
////////////////////////////////////////////////////////////////////////////////

async function procesar_mensaje(json, message){
  
  RecuperarJsonConfMensajes();

  var indice =indexOf2d(message.from);
  let now = new Date();

  var segundos = Math.random() * (seg_hasta - seg_desde) + seg_desde;
  var l_from = message.from;
  var l_json =jsonGlobal[indice][2];
  var l_i = jsonGlobal[indice][1];
  var tam_json =0;
  
  jsonGlobal[indice][3] = now;
  

  console.table(jsonGlobal);
 
  for(var j in jsonGlobal[indice][2]){
    tam_json = tam_json + 1;
  }

  for( var i=jsonGlobal[indice][1]; i < tam_json; i++){
   
    if(l_json[i].cod_error){ 
      var mensaje = l_json[i].msj_error;
      EnviarEmail('ChatBot Api error ',mensaje);
    }else{
      var mensaje =  l_json[i].Respuesta;
    }
      
      if (mensaje == '' || mensaje == null || mensaje == undefined ){
      }
      else{
    
        mensaje = mensaje.replaceAll("|","\n");
    
        console.log("mensaje "+message.from+" - "+mensaje);
        
        if(i<= cant_lim + jsonGlobal[indice][1] -1){
        
         await client.sendMessage(message.from,mensaje );
         await sleep(segundos);
         await io.emit('message', 'Respuesta: '+message.from+': '+ mensaje );
         if(tam_json-1==i){
            bandera_msg=1;
            jsonGlobal[indice][1] = 0;
            jsonGlobal[indice][2] = '';
            jsonGlobal[indice][3] = '';
         }
      }else{
       // for (var j = 0; j < 20; j++){
          msg_lim = msg_lim.replaceAll("|","\n");
        //}
        var msg_loc = msg_lim;

       
        if(tam_json  <= i + cant_lim  ){
          msg_loc = msg_loc.replace('<recuento>', tam_json  - i );
       }else{
        msg_loc = msg_loc.replace('<recuento>', cant_lim+1);
       }
      
        msg_loc = msg_loc.replace('<recuento_lote>', tam_json - 2);
        msg_loc = msg_loc.replace('<recuento_pendiente>', tam_json  - i);
              
        if (msg_loc == '' || msg_loc == null || msg_loc == undefined ){
        }
        else{
          client.sendMessage(message.from,msg_loc);
        }
       bandera_msg=0;
       jsonGlobal[indice][1]  = i;
       jsonGlobal[indice][3] = now;
       return;
      }
    }
  }


};

///////////////////////////////////////////////////////////////////////
// CONTROLA CADUCIDAD DE LOS MESNAJES
///////////////////////////////////////////////////////////////////////

async function controlar_hora_msg(){

  while(a < 1){
     for(var i in jsonGlobal){
     
      if( jsonGlobal[i][3] !== ''){
        var fecha = new Date();
        var fecha_msg = jsonGlobal[i][3].getTime();
        var fecha_msg2 = fecha.getTime();
        var diferencia = fecha_msg2-fecha_msg;
        if(diferencia > time_cad ){
          if(msg_cad == '' || msg_cad  == undefined || msg_cad == 0 ){
            
          } else {
            client.sendMessage(jsonGlobal[i][0],msg_cad );

          }
          console.log("timepo expirado "+ jsonGlobal[i][0]+' '+diferencia+' '+time_cad );
          // delete(jsonGlobal[i]);
          let now = new Date();
          jsonGlobal[i][3] = '';
          jsonGlobal[i][2] = '';
          jsonGlobal[i][1] = 0;
          }
        }

        
        
    }
   
    await sleep(5000);
  }   
}



