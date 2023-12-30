import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import Settings from "@/components/Settings";


const Page = async () => {

  const { getUser } = getKindeServerSession()
  const user = getUser()

  return <Settings user={user} /> 
}

export default Page
