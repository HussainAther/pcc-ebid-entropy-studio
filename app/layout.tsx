import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Entropy Studio",description:"An evidence-aware computational research environment for hypotheses, experiments, simulations, and critical review.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
