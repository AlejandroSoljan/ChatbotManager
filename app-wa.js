//const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const fetch = require('node-fetch');
const wa = require('@open-wa/wa-automate');


//import fetch from 'node-fetch';

wa.create({
  sessionId: "1",
  multiDevice: true, //required to enable multiDevice support
  authTimeout: 60, //wait only 60 seconds to get a connection with the host account device
  blockCrashLogs: true,
  disableSpins: true,
  headless: false,
  hostNotificationLang: 'PT_BR',
  logConsole: false,
  popup: true,
  executablePath: 'C://Program Files//Google//Chrome//Application//chrome.exe',
  qrTimeout: 0, //0 means it will wait forever for you to scan the qr code
}).then(client => start(client));

function start(client) {



  client.onMessage(async message => {

   // console.log(message);

  //  client.sendText(message.to,'prueba');

  var telefonoTo = message.to;
 var telefonoFrom = message.from;

  telefonoTo = telefonoTo.replace('@c.us','');
  telefonoFrom = telefonoFrom.replace('@c.us','');
  
  
  telefonoTo = '543462674133';
  

  
   
    
      var resp = null;
      
      let url = "http://managermsm.ddns.net:2002/ApiChat/api/Api_Chat_Cab/ProcesarMensaje/"+telefonoFrom+"/"+telefonoTo+"/"+message.body;
    // let url = "http://192.168.1.101:2002/ApiChat/api/Api_Chat_Cab/ProcesarMensaje/"+telefonoTo+"/"+telefonoFrom+"/"+message.body;
     console.log(url);
    
      try{
         resp = await fetch(url)
        
        if (resp.ok  ) {
          var json = await resp.json()
          
            console.log("json "+JSON.stringify(json));
            
            
            for(var i in json){
              if(json[i].cod_error){ 
                var mensaje = json[i].msj_error
                }else{
                var mensaje = json[i].respuesta
                }
              await client.sendText(message.from, mensaje);
            }
                }
        else
        {
          console.log("ApiWhatsapp - Response ERROR")
          return 'error'
        }
    }
    catch (err) {
      console.log("ApiWhatsapp - Catch ERROR")
      return 'error'
    }

    
  });
}   