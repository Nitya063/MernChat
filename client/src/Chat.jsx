import { useContext, useEffect, useState } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import { uniqBy } from "lodash";
import { useRef } from "react";
import axios from "axios";
import Contact from "./contact";



export default function Chat(){
    const [ws,setWs]=useState(null);
    const [onlinePeople,setOnlinePeople]=useState({});
    const [selectedUserId,setSelectedUserId]=useState(null);
    const {username,id,setId,setUsername}=useContext(UserContext);
    const [offlinePeople,setOfflinePeople]= useState({});
    const [messages,setMessages]= useState([]);
    const [newMessageText,setNewMessageText]= useState('');
    const divUnderMessages= useRef();
    
    useEffect(()=>{
        connnectToWs();
    },[]);
    function connnectToWs(){
        const ws=new WebSocket('ws://localhost:4040');
        setWs(ws);
        ws.addEventListener('message',handleMessage);
        ws.addEventListener('close',()=>{
            setTimeout(()=>{
            console.log('Disconnected!! Trying to reconnect.');
            connnectToWs();
            },1000);
        });

    }
    function showOnlinePeople(peopleArray){
         const people= {};
         peopleArray.forEach(({userId,username}) => {
            people[userId]=username;            
         });
         setOnlinePeople(people);
    }
    function handleMessage(ev){
      const messageData= JSON.parse(ev.data);
      console.log({ev,messageData});
      if ('online' in messageData){
        showOnlinePeople(messageData.online);
      }else if('text' in messageData) {
        if(messageData.sender=== selectedUserId)
        {
            setMessages(prev=> ([...prev,{...messageData}]));
        }
       
      }
    }

    function logout(){
   axios.post('/logout').then(()=>{
    setWs(null);
    setId(null);
    setUsername(null);
   });
    }

    function sendMessage(ev,file=null){
        if(ev)
        ev.preventDefault();
             //page doesn't gets refreshed
             ws.send(JSON.stringify({
                recipient: selectedUserId,
                text: newMessageText,
                file,
            
        }));
        setNewMessageText('');
        setMessages(prev=>([...prev,{
            text:newMessageText,
            sender:id,
            recipient:selectedUserId,
            _id:Date.now(),
        }]));

      if(file)
      {
        axios.get('/messages/'+selectedUserId).then(res=>{
            setMessages(res.data);
            });
      }  else {
        setNewMessageText('');
        setMessages(prev=>([...prev,{
            text:newMessageText,
            sender:id,
            recipient:selectedUserId,
            _id:Date.now(),
        }]));
      }
    }

    function sendFile(ev){
   const reader=new FileReader();
   reader.readAsDataURL(ev.target.files[0]);
   reader.onload=()=>{
    sendMessage(null,{
        name:ev.target.files[0].name,
        data:reader.result,
    });
   };
   
}

    useEffect(()=>{
        const div= divUnderMessages.current;
        if(div){
        div.scrollIntoView({behaviour:'smooth',block:'end'});
        }

    },[messages]);

    useEffect(()=>{
       axios.get('/people').then(res=>{
        const offlinePeopleArr = res.data
        .filter(p=>p._id!== id)
        .filter(p=>!Object.keys(onlinePeople).includes(p._id));
        const offlinePeople={};
        offlinePeopleArr.forEach(p=>{
        offlinePeople[p._id]=p;
        });
        
        setOfflinePeople(offlinePeople);
       });
    },[onlinePeople]);

useEffect(()=>{
    if(selectedUserId){
        axios.get('/messages/'+selectedUserId).then(res=>{
        setMessages(res.data);
        });
    }
},[selectedUserId]);
    
    const onlinePeopleExclOurUser = {...onlinePeople};
    delete onlinePeopleExclOurUser[id];//EXCLUDING OURSELVES

    const messagesWithoutDupes= uniqBy(messages,'_id');


    return(
        <div className="flex h-screen">
            <div className="bg-white w-1/3 flex flex-col">
                <div className="flex-grow">
                <Logo/>
                {Object.keys(onlinePeopleExclOurUser).map(userId=>(
                   <Contact 
                   key={userId}
                   id={userId}
                   online={true}
                   username={onlinePeopleExclOurUser[userId]}
                   onClick={()=>setSelectedUserId(userId)}
                   selected={userId===selectedUserId}/>
                ))}
               {Object.keys(offlinePeople).map(userId=>(
                   <Contact 
                   id={userId}
                   online={false}
                   username={offlinePeople[userId].username}
                   onClick={()=>setSelectedUserId(userId)}
                   selected={userId===selectedUserId}/>
                ))}
                </div>
               
                <div className="p-2 text-center flex items-center justify-center">
                    <span className="mr-2 text-sm text-gray-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
  <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
</svg>

                         {username}
                         </span>
                    <button 
                    onClick={logout}
                    className="text-sm text-gray-600 bg-purple-200 py-1 px-2 border rounded-sm">logout</button>
                    </div>
            </div>

            
              <div className="flex flex-col bg-purple-200 w-2/3 p-2">
                <div className="flex-grow">
                    {!selectedUserId && (
                        <div className="flex h-full items-center justify-center text-2xl">
                            <div className="text-gray-400">
                               &larr; Select a person from the sidebar
                            </div>
                        </div>
                    )} 
                    {!!selectedUserId && (
                        // <div className="mb-4">
                             <div className="relative h-full">
                             <div className="overflow-y-scroll absolute left-0 right-0 top-0 bottom-2">
                            {messagesWithoutDupes.map(message=> (
                                <div key={message._id} className={(message.sender===id?'text-right':'text-left')}>
                                    <div className={"text-left inline-block p-2 my-3 rounded-md text-sm "+(message.sender === id?'bg-purple-500 text-white':'bg-white text-gray-500')}>
                                   {     message.text}
                                   {message.file && (
                                    <div className="">
                                        
                                        {/* <a target="_blank" className="flex items-center gap-1 border-b" href={'https://res.cloudinary.com/dmhwnntw1/image/upload/v1704994122/'+ message.file}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z" clipRule="evenodd" />
                            </svg>
                            {message.file}
                          </a> */}
                          <img className="cursor-pointer"
                              src={`https://res.cloudinary.com/dmhwnntw1/image/upload/v1704994122/${message.file}`}
                              alt="image"
                          />
                                    </div>
                                   )}
                                    </div>
                                </div>
                               
                            ))}
                            <div ref={divUnderMessages}></div> 
                        </div>
                        </div>
                        //</div>
                        
                       
                    )}

                </div>
                {!!selectedUserId && (
                    <form className="flex gap-2 h-9" onSubmit={sendMessage}>
                    <input type="text" 
                    value={newMessageText}
                    onChange={ev=>setNewMessageText(ev.target.value)}
                    className="bg-white flex-grow border pd-2 rounded-sm ml-1" 
                    placeholder="Type your message here"  />
                    <label className="bg-purple-300 p-1 text-gray-600 cursor-pointer border border-purple-600 rounded-sm">
                        <input type="file" className="hidden" onChange={sendFile}/>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 m-0">
  <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" />
</svg>

                    </label>
                    <button className="bg-purple-600 pd-2 text-white rounded-sm h-9 w-8">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                     </svg>
                     </button>
                 </form>
                )}
                
            </div>
        </div>
    );
    }