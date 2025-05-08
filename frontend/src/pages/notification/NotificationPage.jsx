import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { toast } from "react-hot-toast"
import { formatPostDate } from "../../utils/date/index"

import { IoSettingsOutline } from "react-icons/io5"
import { FaRegComment } from "react-icons/fa"
import { FaUser } from "react-icons/fa"
import { FaHeart } from "react-icons/fa6"

const NotificationPage = () => {
    const queryCient = useQueryClient();

    const { data:notifications, isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: async() => {
            try{
                const res = await fetch("/api/notifications");
                const data = await res.json();

                if(!res.ok){
                    throw new Error(data.error || "Something went wrong");
                }

                return data;
            }
            catch(error){
                throw new Error(error.message)
            }
        },
    })

    const { mutate:deleteNotifications } = useMutation({
        mutationFn: async() => {
            try{
                const res = await fetch("/api/notifications", {
                    method: "DELETE",
                })
                const data = await res.json();

                if(!res.ok){
                    throw new Error(data.error || "Something went wrong");
                }

                return data;
            }
            catch(error){
                throw new Error(error.message)
            }
        },
        onSuccess:() => {
            toast.success("Notifications deleted successfully")
            queryCient.invalidateQueries({queryKey: ["notifications"]})
        },
        onError: (error) => {
            toast.error(error.message)
        },
    })

  return (
    <>
        <div className="flex-[4_4_0] border-1 border-r border-gray-700 min-h-screen">
            <div className="flex justify-between itmes-center p-4 border-b border-gray-700">
                <p className="font-bold">
                    Notifications
                </p>
                <div className="dropdown">
                    <div tabIndex={0} role="button" className="m-1">
                        <IoSettingsOutline className="w-4" />
                    </div>
                    <ul tabIndex={0} className="dropdwon-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                        <li>
                            <a onClick={deleteNotifications}>
                                Delete all notifications
                            </a>
                        </li>    
                    </ul>
                </div>
            </div>
            {isLoading && (
                <div className="flex justify-center h-full items-center">
                    <LoadingSpinner size="lg" />
                </div>
            )}
            {notifications?.length === 0 && <div className="text-center p-4 font-bold">No notifications :(</div>}
            {notifications?.map((notification) => (
                <div className="border-b border-gray-700" key={notification._id}>
                    <span className="float-right p-1 text-slate-500">{formatPostDate(notification.createdAt)}</span>
                    <div className="flex gap-2 p-4">
                        {notification.type === "follow" && <FaUser className="w-7 h-7 text-primary" />}
                        {notification.type === "like" && <FaHeart className="w-7 h-7 text-red-500" />}
                        {notification.type == "comment" && <FaRegComment className="w-7 h-7 text-primary" />}
                        <Link to={`/profile/${notification.from.username}`}>
                            <div className="avatar">
                                <div className="w-8 rounded-full">
                                    <img src={notification.from.profileImg || "/avatar-placeholder.png"} />
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-bold">
                                    @{notification.from.username}
                                </span>
                                {" "}
                                {notification.type === "follow" && <p>followed you</p>}
                                {notification.type === "like" && <p>liked your post</p>}
                                {notification.type == "comment" && <p>left a comment</p>}
                            </div>
                        </Link>
                    </div>
                </div>
            ))}
        </div>
    </>
  )
}

export default NotificationPage