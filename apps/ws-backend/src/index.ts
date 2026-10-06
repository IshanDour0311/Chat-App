import { WebSocketServer } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken"; 
import { JWT_SECRET } from "@repo/backend-common/config" ; 
import {prismaClient} from "@repo/db";


const wss = new WebSocketServer({ port: 8080 });

function checkUser(token: string): string|null {
   try{
   const decoded = jwt.verify(token, JWT_SECRET);
    if(!decoded || !(decoded as JwtPayload).userId){
           
    return null;
}
return (decoded as JwtPayload).userId;
}
catch(e){
    console.error("JWT ERROR:", e);
    return null;
}

}
interface user{
   userId:string;
   rooms:string[];
   ws:any;
}
const users: user[] = [];



wss.on("connection",(ws,request)=>{
     const url=request.url;
     if(!url){
        return;
     }
     const queryparams=new URLSearchParams(url.split("?")[1]);
        const token=queryparams.get("token") || "";
      const userId=checkUser(token);
      if(!userId){
        ws.close();
        return;
      }
       
      users.push({
         userId,
         rooms: [],
         ws


       });


       ws.on("message",async (data)=>{
          const parsedData=JSON.parse(data as unknown as string);
          try{ 
          if(parsedData.type==="joinRoom"){
               const user=users.find(u=>u.userId===userId);
              if(!user){
               console.log("user not exists")
                   return;
              }
              user.rooms.push(parsedData.roomId);

          }
        }catch(e){
            console.error("Error processing message:", e);
        }
         
          if(parsedData.type==="chat"){
        const user=users.find(u=>u.userId===userId);
              if(!user){
               console.log("user not exists")
                   return;
              }

              await prismaClient.chat.create({
                data:{
                    roomId:parsedData.roomId,
                    userId:userId,
                    message:parsedData.message
                }
              });
               users.forEach(user=>{
              if(user.rooms.includes(parsedData.roomId)){
                
                        user.ws.send(JSON.stringify({
                            type:"chat",
                            roomId:parsedData.roomId,
                            message:parsedData.message,
                            userId
                        }));
                    

               }
            });
          }
          if(parsedData.type==="leaveRoom"){
              
               const user=users.find(u=>u.userId===userId);
              if(!user){
               console.log("user not exists")
                   return;
              }
              user.rooms = user.rooms.filter(r => r === parsedData.roomId);
          }
       });

});