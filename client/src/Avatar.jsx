export default function Avatar({userId,username,online}){
    const colors=['bg-green-300','bg-teal-300','bg-red-300','bg-purple-300','bg-blue-300','bg-gray-300'];
    const userIdBase10=parseInt(userId,16);
    const colorIndex = userIdBase10 % colors.length;
    const color=colors[colorIndex];

    return(
    <div className={"w-8 h-8 relative rounded-full items-center "+color}>
       <div className="text-center w-full opacity-60 text-lg">{username[0]}</div> 
       {online && (
            <div className="absolute w-2 h-2 bg-green-600 bottom-0 right-0 rounded-full border-white shadow-lg shadow-black"></div>
       )}
        {!online && (
            <div className="absolute w-2 h-2 bg-gray-600 bottom-0 right-0 rounded-full border-white shadow-lg shadow-black"></div>
       )}
      
    </div>
    );
}