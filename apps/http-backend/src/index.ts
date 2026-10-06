import express from "express";
import { middleware } from "./middleware.js";

import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
// @ts-ignore
import {CreateUserSchema,signinSchema,createRoomSchema} from "@repo/common/types";
import {prismaClient} from "@repo/db";

const app=express();
app.use(express.json());


app.post("/signup",async(req,res)=>{
    const email=req.body.email;
    console.log(email);
    const parsedData=CreateUserSchema.safeParse(req.body);
    console.log(parsedData);
    console.log("difference");
    console.log(req.body);
    if(!parsedData.success){
        return res.status(400).json({message:"Invalid input"});
    }
    console.log("before");
   try{
     console.log("inside");
 const users= await prismaClient.user.create({
        data:{
            email:parsedData.data.email,
            name:parsedData.data.name,
            password:parsedData.data.password
        }
    });
     console.log("added");
     res.json({
          usersID:users.id,
             message:"User created successfully"

     });
    }
     
    catch(e){
        console.error("PRISMA ERROR:", e);
    return res.status(500).json({message:"email already exists"});
     }
      console.log("after catche");

});

app.post("/signin",async (req,res)=>{
    const parsedData=signinSchema.safeParse(req.body);
    if(!parsedData.success){
        return res.status(400).json({message:"Invalid input"});
    }

     const user=await prismaClient.user.findFirst({
        where:{
           email:parsedData.data.email,
            password:parsedData.data.password
        }});
        if(!user){
            return res.status(401).json({message:"user not exists"});
        }

   const token=jwt.sign({userId:user.id},JWT_SECRET);
   res.json({token:token})
});


app.post("/room",middleware,async(req,res)=>{
    const parsedData=createRoomSchema.safeParse(req.body);
    if(!parsedData.success){
        return res.status(400).json({message:"Invalid input"});
    }
    // @ts-ignore
    const userId=req.userId;
try{
  const roomval=  await prismaClient.room.create({
        data:{
            slug:parsedData.data.slug,
            adminId:userId
        }
    });

     res.json({message:"room created successfully",
               roomId:roomval.id
    });

}catch(e){
    return res.status(500).json({message:e});
}
});

app.get("/chats/:roomId",middleware,async(req,res)=>{    
 const roomId=req.params.roomId;
 const messages =await prismaClient.chat.findMany({
    where:{
        roomId :roomId as string,

    },orderBy:{
        id:"desc"
    },
    take:50
 });
 res.json({
    messages
 })
});
app.listen(3002);
