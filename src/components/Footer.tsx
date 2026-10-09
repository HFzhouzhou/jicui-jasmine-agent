import { NavLink } from 'react-router-dom';
import { Leaf, MapPin, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-foreground/5 border-t border-border/40 mt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Leaf className="size-5 text-primary" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold text-foreground">极萃东方茉莉</span>
                <span className="text-[10px] text-muted-foreground">JICUI ORIENTAL JASMINE TEA</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              茉莉香为引，花样东方茶<br />
              让茉莉花香成为东方茶客日常的温暖记忆
            </p>
            <div className="text-xs text-muted-foreground/80">
              © 2025 极萃东方茉莉 · 大学生创新创业项目
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">快速导航</h4>
            <nav className="flex flex-col gap-2">
              <NavLink to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                首页
              </NavLink>
              <NavLink to="/ai-recommend" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                AI 随心配 · 茉莉娘子
              </NavLink>
              <NavLink to="/menu" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                菜单库
              </NavLink>
              <NavLink to="/project" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                项目方案
              </NavLink>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">联系我们</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Phone className="size-4 shrink-0 mt-0.5 text-primary" />
                <div>
                  <div>项目负责人：覃静</div>
                  <div>15778373666</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="size-4 shrink-0 mt-0.5 text-primary" />
                <span>广西横州市极萃园中国茉莉花馆二楼</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
