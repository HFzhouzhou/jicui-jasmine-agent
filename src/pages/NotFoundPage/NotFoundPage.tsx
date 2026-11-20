import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen } from "lucide-react";
import JasmineMark from "@/components/brand/JasmineMark";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="flex size-20 items-center justify-center rounded-[28px] bg-jade shadow-[0_20px_40px_-20px_rgba(31,74,51,.9)]"><JasmineMark className="size-11" petal="#fffdf7" /></span>
      <p className="eyebrow mt-8">404 · PAGE NOT FOUND</p>
      <h1 className="mt-3 font-serif text-[34px] font-semibold text-ink sm:text-[44px]">这一页，茶还没泡上。</h1>
      <p className="mt-3 max-w-sm text-[15px] leading-7 text-stone">链接可能已经失效。</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/menu" className="btn-ghost h-12 px-6"><BookOpen className="size-4" aria-hidden="true" />返回茶单</Link>
        <Link to="/ai-recommend" className="btn-jade h-12 px-6">开始随心配<ArrowUpRight className="size-4" /></Link>
      </div>
    </div>
  );
}
