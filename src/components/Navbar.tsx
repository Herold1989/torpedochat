import Link from "next/link"
import MaxWidthWrapper from "./MaxWidthWrapper"
import { buttonVariants } from "@/components/ui/button"
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/server"
import { ArrowRight } from "lucide-react"
import Image from "next/image";

const Navbar = () => {
    return (
        <nav className="sticky h-14 inset-x-0 top-0 z-30 w-full border-b border-gray-200 bg-white/75 backdrop-blur-lg transition-all">
            <MaxWidthWrapper>
                <div className="flex h-14 items-center justify-between border-b border-zinc-200">
                    <Link href="/" className="flex z-40 font-semibold">
                        {/*<span className="text-blue-600">torpedo<span className="text-orange-400">chat.</span></span>*/}
                        <Image src="/torpedochat_logo_full_size.png" alt="company logo" width={150} height={38} quality={100}/>
                    </Link>
                    {/* Add mobile Navbar after authentification */}
                    <div className="hidden items-center space-x-4 sm:flex"></div>
                    <>
                    <Link href="/pricing" className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                    })}>Pricing</Link>
                    <LoginLink className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                    })}>Sign In</LoginLink>
                    <RegisterLink className={buttonVariants({
                        size: "sm",
                    })}>Get started <ArrowRight className="ml-1.5 h-5 w-5"/></RegisterLink>
                    </>
                </div>
            </MaxWidthWrapper>
        </nav>
    )
}

export default Navbar