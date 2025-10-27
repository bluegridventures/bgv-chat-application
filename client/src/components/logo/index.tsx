import { Link } from "react-router-dom";
import logoSvg from "@/assets/bgv-logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  url?: string;
  showText?: boolean;
  imgClass?: string;
  textClass?: string;
}

const Logo = ({
  url = "/",
  imgClass = "size-[50px]",
}: LogoProps) => (
  <Link to={url} className="flex items-center gap-2 w-fit p-1 bg-white rounded-full">
    <img src={logoSvg} alt="Whop" className={cn(imgClass)} />
  </Link>
);

export default Logo;
