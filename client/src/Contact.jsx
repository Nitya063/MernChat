import Avatar from "./Avatar";

export default function Contact({id,username,onClick,selected,online}){
    return(
        <div key={id} onClick={()=> onClick(id)} 
        className={"border-b border-gray-300 flex items-center gap-2 cursor-pointer "+(selected?'bg-purple-200':'')}>
            {selected && (
             <div className="w-1 bg-purple-600 h-14  rounded-r-md"></div>
            )
            }
            <div className="flex gap-3 py-3 pl-4 items-center">
            {<Avatar online={online} username={username} userId={id}/> }
            <span className="text-gray-700 font-semibold">
            {username}
            </span>
            </div>
           
        </div>
    );
}