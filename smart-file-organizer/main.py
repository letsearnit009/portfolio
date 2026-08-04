import os, json, shutil, math, winsound, threading
from datetime import datetime
from tkinter import *
from tkinter import filedialog, messagebox
from tkinterdnd2 import TkinterDnD, DND_FILES

CFG="config.json"; RECENT="recent.json"
CATS={
    "Images": [".jpg",".jpeg",".png",".gif",".bmp",".svg",".webp",".ico",".tiff"],
    "Documents": [".pdf",".doc",".docx",".txt",".xlsx",".xls",".pptx",".ppt",".csv",".rtf",".md"],
    "Videos": [".mp4",".avi",".mkv",".mov",".wmv",".flv",".webm",".m4v"],
    "Audio": [".mp3",".wav",".flac",".aac",".ogg",".wma",".m4a"],
    "Code": [".py",".js",".html",".css",".java",".cpp",".c",".ts",".json",".xml"],
    "Archives": [".zip",".rar",".7z",".tar",".gz"],
}

def snd(n):
    try:
        if n=="ok": winsound.Beep(1200,60); winsound.Beep(1600,60)
        elif n=="ui": winsound.Beep(1000,30)
    except: pass

def loadj(p,d):
    try:
        if os.path.exists(p):
            with open(p) as f: return json.load(f)
    except: pass
    return d
def savej(p,d):
    with open(p,"w") as f: json.dump(d,f,indent=2)

G="#d4a843"; GB="#f0d060"; GD="#9a7830"
BG="#06060a"; CD="#101018"; CD2="#16161e"; GL="#0a0a12"
TX="#c8c0b0"; DM="#504838"; BD="#1a1820"


class Particle:
    def __init__(s,w,h):
        import random
        s.x=random.uniform(0,w); s.y=random.uniform(0,h)
        s.r=random.uniform(1,2.8); s.vx=random.uniform(0.4,1.6); s.vy=0
        s.wa=random.uniform(20,50); s.wf=random.uniform(0.006,0.018); s.wo=random.uniform(0,6.28)
        s.gold=random.random()<0.35
        s.col=G if s.gold else random.choice(["#2a2018","#1e1810","#151210"])
        s.w=w; s.h=h
    def tick(s,t,mx,my):
        s.x+=s.vx; s.y+=s.vy+math.sin(t*s.wf+s.wo)*0.7
        dx=mx-s.x; dy=my-s.y; d=math.sqrt(dx*dx+dy*dy)
        if d<200 and d>1: f=(200-d)/200; s.y+=dy*f*0.02; s.x+=dx*f*0.01
        s.vx=max(0.2,min(s.vx,2.5))
        if s.x>s.w+30: s.x=-10


class App:
    def __init__(s):
        s.root=TkinterDnD.Tk()
        s.root.title("Smart File Organizer")
        s.root.geometry("980x780")
        s.root.minsize(880,680)
        s.root.configure(bg=BG)

        s.cfg=loadj(CFG,dict(CATS)); s.recent=loadj(RECENT,[])
        s.folder=StringVar(value="No folder selected")
        s.stats={}; s.undo=[]; s.log_e=[]; s.busy=False
        s.mx=0; s.my=0; s.parts=[]; s.t=0; s.run=True

        s.wrap=Frame(s.root,bg=BG); s.wrap.pack(fill=BOTH,expand=True)
        s.bcv=Canvas(s.wrap,bg=BG,highlightthickness=0); s.bcv.place(x=0,y=0,relwidth=1,relheight=1)
        s.ct=Frame(s.wrap,bg=BG); s.ct.place(relx=0.5,rely=0.5,anchor=CENTER,relwidth=0.84,relheight=0.93)

        s.root.bind("<Motion>",s._mm)
        s.root.bind("<Control-Return>",lambda e:s.go())

        s._build(); s._drop(); s._anim(); s._tw()
        s.root.protocol("WM_DELETE_WINDOW",s._quit)

    def _build(s):
        # Header
        s.tw_lbl=Label(s.ct,text="",font=("Segoe UI",28,"bold"),bg=BG,fg=G)
        s.tw_lbl.pack(pady=(0,4))
        c=Canvas(s.ct,height=1,bg=BG,highlightthickness=0); c.pack(fill=X,pady=(6,0))
        c.create_line(0,0,600,0,fill=GD,width=1)
        Label(s.ct,text="Premium File Management",font=("Segoe UI",10),bg=BG,fg=DM).pack(pady=(6,18))

        # Folder card
        fc=Frame(s.ct,bg=CD,highlightbackground=BD,highlightthickness=1); fc.pack(fill=X,pady=(0,12))
        fi=Frame(fc,bg=CD); fi.pack(fill=X,padx=20,pady=14)
        Label(fi,text="TARGET FOLDER",font=("Segoe UI",9,"bold"),bg=CD,fg=GD).pack(anchor=W)
        fr=Frame(fi,bg=CD); fr.pack(fill=X,pady=(10,0))
        Label(fr,textvariable=s.folder,font=("Consolas",11),bg=GL,fg=TX,anchor=W,padx=14,pady=10,highlightbackground=BD,highlightthickness=1).pack(side=LEFT,fill=X,expand=True)
        Button(fr,text="\u25bc",font=("Segoe UI",8),bg=GL,fg=GD,activebackground=CD2,relief=FLAT,padx=10,pady=5,cursor="hand2",command=s._rmenu,highlightbackground=BD,highlightthickness=1).pack(side=RIGHT,padx=(6,0))
        s._gbtn(fr,"BROWSE",s._browse,140,40).pack(side=RIGHT,padx=(10,0))

        # Stats card
        sc=Frame(s.ct,bg=CD,highlightbackground=BD,highlightthickness=1); sc.pack(fill=X,pady=(0,12))
        si=Frame(sc,bg=CD); si.pack(fill=X,padx=20,pady=14)
        Label(si,text="FILE ANALYSIS",font=("Segoe UI",9,"bold"),bg=CD,fg=GD).pack(anchor=W)
        sg=Frame(si,bg=CD); sg.pack(fill=X,pady=(12,0))
        s.sclbl={}
        cats=["Total","Images","Documents","Videos","Audio","Code","Other"]
        cols=[G,"#b08838","#a07830","#906828","#805820","#604818","#484048"]
        for i,cat in enumerate(cats):
            cf=Frame(sg,bg=GL,highlightbackground=BD,highlightthickness=1)
            cf.grid(row=i//4,column=i%4,padx=5,pady=5,sticky="nsew")
            v=Label(cf,text="0",font=("Segoe UI",22,"bold"),bg=GL,fg=cols[i]); v.pack(pady=(10,2))
            l=Label(cf,text=cat,font=("Segoe UI",8),bg=GL,fg=DM); l.pack(pady=(0,8))
            s.sclbl[cat]=v
        for i in range(4): sg.columnconfigure(i,weight=1)

        # Buttons
        bf=Frame(s.ct,bg=BG); bf.pack(fill=X,pady=(0,14))
        s.go_btn=s._gbtn(bf,"ORGANIZE FILES",s.go,240,52); s.go_btn.pack(side=LEFT,padx=(0,12))
        s.un_btn=s._obtn(bf,"UNDO",s._undo,"#d04040"); s.un_btn.pack(side=LEFT,padx=(0,8)); s._dis(s.un_btn)
        s.ex_btn=s._obtn(bf,"EXPORT",s._export,"#9070c0"); s.ex_btn.pack(side=LEFT,padx=(0,8))
        s.st_btn=s._obtn(bf,"SETTINGS",s._settings,"#50c0c8"); s.st_btn.pack(side=LEFT)

        # Progress
        s.pf=Frame(s.ct,bg=BG)
        pb=Frame(s.pf,bg=GL,highlightbackground=BD,highlightthickness=1); pb.pack(fill=X,ipady=2)
        s.pbar=Canvas(pb,bg=GL,highlightthickness=0,height=5); s.pbar.pack(fill=X,padx=2,pady=2)
        s.plbl=Label(s.pf,text="",font=("Segoe UI",9),bg=BG,fg=DM); s.plbl.pack(anchor=W,pady=(6,0))

        # Log
        lc=Frame(s.ct,bg=CD,highlightbackground=BD,highlightthickness=1); lc.pack(fill=BOTH,expand=True)
        li=Frame(lc,bg=CD); li.pack(fill=BOTH,expand=True,padx=20,pady=14)
        Label(li,text="ACTIVITY LOG",font=("Segoe UI",9,"bold"),bg=CD,fg=GD).pack(anchor=W)
        lcc=Frame(li,bg=GL,highlightbackground=BD,highlightthickness=1); lcc.pack(fill=BOTH,expand=True,pady=(10,0))
        s.lcv=Canvas(lcc,bg=GL,highlightthickness=0)
        sb=Scrollbar(lcc,command=s.lcv.yview,bg=BD,troughcolor=GL)
        s.lin=Frame(s.lcv,bg=GL)
        s.lin.bind("<Configure>",lambda e:s.lcv.configure(scrollregion=s.lcv.bbox("all")))
        s.lcv.create_window((0,0),window=s.lin,anchor="nw",width=720)
        s.lcv.configure(yscrollcommand=sb.set)
        sb.pack(side=RIGHT,fill=Y); s.lcv.pack(fill=BOTH,expand=True)

    # Gold button
    def _gbtn(s,p,text,cmd,w,h):
        f=Frame(p,bg=BG)
        cv=Canvas(f,width=w,height=h,bg=BG,highlightthickness=0,cursor="hand2"); cv.pack()
        hov=[False]; prs=[False]
        def draw():
            cv.delete("all")
            if hov[0] and not prs[0]:
                for i in range(4,0,-1): cv.create_rectangle(2-i,2-i,w-2+i,h-2+i,outline=GD,width=1)
            fill=GD if prs[0] else (GB if hov[0] else G)
            out=G if hov[0] else GD
            cv.create_rectangle(2,2,w-2,h-2,fill=fill,outline=out,width=1)
            cv.create_text(w//2,h//2,text=text,fill=BG,font=("Segoe UI",12,"bold"))
        def ent(e): hov[0]=True; draw(); snd("ui")
        def lev(e): hov[0]=False; prs[0]=False; draw()
        def prs_(e): prs[0]=True; draw()
        def rel(e): prs[0]=False; draw(); snd("ok"); cmd()
        cv.bind("<Enter>",ent); cv.bind("<Leave>",lev)
        cv.bind("<ButtonPress-1>",prs_); cv.bind("<ButtonRelease-1>",rel)
        def setstate(st):
            if st==DISABLED: cv.config(cursor=""); cv.unbind("<Enter>"); cv.unbind("<Leave>"); cv.unbind("<ButtonPress-1>"); cv.unbind("<ButtonRelease-1>")
            else: cv.config(cursor="hand2"); cv.bind("<Enter>",ent); cv.bind("<Leave>",lev); cv.bind("<ButtonPress-1>",prs_); cv.bind("<ButtonRelease-1>",rel)
        f._set=setstate; return f

    def _obtn(s,p,text,cmd,color):
        f=Frame(p,bg=BG)
        cv=Canvas(f,width=120,height=40,bg=BG,highlightthickness=0,cursor="hand2"); cv.pack()
        hov=[False]
        def draw():
            cv.delete("all")
            if hov[0]:
                cv.create_rectangle(1,1,119,39,fill=CD2,outline=color,width=1)
                cv.create_text(60,20,text=text,fill=color,font=("Segoe UI",10,"bold"))
            else:
                cv.create_rectangle(1,1,119,39,fill=CD,outline=BD,width=1)
                cv.create_text(60,20,text=text,fill=color,font=("Segoe UI",10))
        def ent(e): hov[0]=True; draw(); snd("ui")
        def lev(e): hov[0]=False; draw()
        cv.bind("<Enter>",ent); cv.bind("<Leave>",lev)
        cv.bind("<ButtonRelease-1>",lambda e:(snd("ok"),cmd()))
        def setstate(st):
            if st==DISABLED: cv.config(cursor=""); cv.unbind("<Enter>"); cv.unbind("<Leave>"); cv.unbind("<ButtonRelease-1>")
            else: cv.config(cursor="hand2"); cv.bind("<Enter>",ent); cv.bind("<Leave>",lev); cv.bind("<ButtonRelease-1>",lambda e:(snd("ok"),cmd()))
        f._set=setstate; return f

    def _dis(s,b):
        try: b._set(DISABLED)
        except: pass
    def _en(s,b):
        try: b._set(NORMAL)
        except: pass

    # Typewriter
    def _tw(s):
        s.ttxt="SMART FILE ORGANIZER"; s.ti=0; s.td=False; s._twk()
    def _twk(s):
        if not s.run: return
        if not s.td:
            s.ti+=1; s.tw_lbl.config(text=s.ttxt[:s.ti])
            if s.ti>=len(s.ttxt): s.td=True; s.root.after(2800,s._twk); return
            s.root.after(65,s._twk)
        else:
            s.ti-=1; s.tw_lbl.config(text=s.ttxt[:s.ti])
            if s.ti<=0: s.td=False; s.root.after(700,s._twk); return
            s.root.after(30,s._twk)

    # Drop
    def _drop(s):
        s.root.drop_target_register(DND_FILES)
        s.root.dnd_bind("<<Drop>>",s._ondrop)
        s.root.dnd_bind("<<DragEnter>>",s._ondenter)
        s.root.dnd_bind("<<DragLeave>>",s._ondleave)
        s._ov=None

    def _ondenter(s,e):
        if s._ov: return
        s._ov=Canvas(s.wrap,bg="#000000",highlightthickness=0)
        s._ov.place(relx=0,rely=0,relwidth=1,relheight=1)
        w=s.root.winfo_width(); h=s.root.winfo_height(); cx,cy=w//2,h//2
        for i in range(5,0,-1): s._ov.create_rectangle(cx-220-i*12,cy-80-i*8,cx+220+i*12,cy+80+i*8,outline=GD,width=1)
        s._ov.create_rectangle(cx-220,cy-80,cx+220,cy+80,fill=CD,outline=G,width=2)
        s._ov.create_text(cx,cy-20,text="DROP FOLDER HERE",fill=G,font=("Segoe UI",20,"bold"))
        s._ov.create_text(cx,cy+15,text="Release to scan & organize",fill=DM,font=("Segoe UI",11))
        s._ov.drop_target_register(DND_FILES)
        s._ov.dnd_bind("<<Drop>>",s._drop2)

    def _drop2(s,e):
        s._killov(); p=e.data.strip("{}")
        if os.path.isdir(p): s.folder.set(p); s._addrecent(p); s._scan(p)

    def _ondleave(s,e): s._killov()
    def _killov(s):
        if s._ov: s._ov.destroy(); s._ov=None
    def _ondrop(s,e):
        s._killov(); p=e.data.strip("{}")
        if os.path.isdir(p): s.folder.set(p); s._addrecent(p); s._scan(p)

    def _addrecent(s,p):
        if p in s.recent: s.recent.remove(p)
        s.recent.insert(0,p); s.recent=s.recent[:5]; savej(RECENT,s.recent)

    def _rmenu(s):
        snd("ui")
        m=Menu(s.root,bg=CD,fg=TX,activebackground=GD,activeforeground=BG,relief=FLAT,borderwidth=0)
        if not s.recent: m.add_command(label="No recent folders",state=DISABLED)
        else:
            for p in s.recent: m.add_command(label=p,command=lambda f=p:s._selrecent(f))
        m.tk_popup(s.root.winfo_rootx()+400,s.root.winfo_rooty()+200)

    def _selrecent(s,p):
        if os.path.isdir(p): s.folder.set(p); s._scan(p); snd("ui")

    def _mm(s,e): s.mx=e.x; s.my=e.y

    # Anim
    def _anim(s):
        if not s.run: return
        s.bcv.delete("all")
        w=s.root.winfo_width(); h=s.root.winfo_height()
        if not s.parts:
            for _ in range(35): s.parts.append(Particle(w,h))
        s.t+=1
        for p in s.parts:
            p.w=w; p.h=h; p.tick(s.t,s.mx,s.my)
            dx=s.mx-p.x; dy=s.my-p.y; d=math.sqrt(dx*dx+dy*dy)
            glow=1+(200-d)/200*0.5 if d<200 else 1; sz=p.r*glow
            if p.gold: s.bcv.create_oval(p.x-sz,p.y-sz,p.x+sz,p.y+sz,fill=p.col,outline="")
            else: s.bcv.create_oval(p.x-sz*0.5,p.y-sz*0.5,p.x+sz*0.5,p.y+sz*0.5,fill=p.col,outline="")
        for i,a in enumerate(s.parts):
            if not a.gold: continue
            for b in s.parts[i+1:i+4]:
                if not b.gold: continue
                dd=((a.x-b.x)**2+(a.y-b.y)**2)**0.5
                if dd<140: s.bcv.create_line(a.x,a.y,b.x,b.y,fill=GD,width=1)
        gx=w*0.15+(s.mx/w)*w*0.1; gy=h*0.25+(s.my/h)*h*0.08
        for r in range(4):
            sz=90+r*70; s.bcv.create_oval(gx-sz,gy-sz,gx+sz,gy+sz,fill="",outline=GD,width=1)
        s.root.after(28,s._anim)

    # Logic
    def _browse(s):
        p=filedialog.askdirectory(title="Select folder")
        if p: s.folder.set(p); s._addrecent(p); s._scan(p)

    def _scan(s,folder):
        s.stats={c:0 for c in s.cfg}; s.stats["Other"]=0
        try: files=[x for x in os.listdir(folder) if os.path.isfile(os.path.join(folder,x))]
        except Exception as e: s._log(f"Error: {e}","err"); return
        for f in files:
            ext=os.path.splitext(f)[1].lower(); found=False
            for c,exts in s.cfg.items():
                if ext in exts: s.stats[c]+=1; found=True; break
            if not found: s.stats["Other"]+=1
        tot=sum(s.stats.values()); s._as("Total",tot)
        for c in ["Images","Documents","Videos","Audio","Code","Other"]:
            s._as(c,s.stats.get(c,0))
        s._log(f"Scanned {os.path.basename(folder)} \u2014 {tot} files","info")

    def _as(s,cat,tgt):
        v=s.sclbl.get(cat)
        if not v: return
        cur=int(v.cget("text") or "0")
        if cur==tgt: return
        step=1 if tgt>cur else -1
        def tk(c=cur):
            if c==tgt: v.config(text=str(tgt)); return
            c+=step; v.config(text=str(c)); s.root.after(22,tk,c)
        tk()

    def _safe(s,dest,name):
        p=os.path.join(dest,name)
        if not os.path.exists(p): return p
        n,e=os.path.splitext(name); i=1
        while os.path.exists(p): p=os.path.join(dest,f"{n} ({i}){e}"); i+=1
        return p

    def go(s):
        f=s.folder.get()
        if f=="No folder selected" or not os.path.isdir(f): messagebox.showwarning("No Folder","Select a folder!"); return
        if s.busy: return
        snd("ok"); s.busy=True; s._dis(s.go_btn)
        s.pf.pack(fill=X,pady=(0,12)); s.plbl.config(text="Preparing...")
        threading.Thread(target=s._work,args=(f,),daemon=True).start()

    def _work(s,folder):
        s.undo=[]; moved=0; fail=0
        try: files=[x for x in os.listdir(folder) if os.path.isfile(os.path.join(folder,x))]
        except Exception as e: s.root.after(0,s._log,f"Error: {e}","err"); s.root.after(0,s._done); return
        tot=len(files); s.root.after(0,s.plbl.config,{"text":f"0 / {tot} files"})
        for i,f in enumerate(files):
            ext=os.path.splitext(f)[1].lower(); cat="Other"
            for c,exts in s.cfg.items():
                if ext in exts: cat=c; break
            d=os.path.join(folder,cat); os.makedirs(d,exist_ok=True)
            src=os.path.join(folder,f); dst=s._safe(d,f)
            try:
                shutil.move(src,dst); s.undo.append((dst,src)); moved+=1
                ts=datetime.now().strftime("%H:%M:%S")
                s.root.after(0,s._log,f"{ts}  {f} \u2192 {cat}","ok")
            except: fail+=1; s.root.after(0,s._log,f"{datetime.now().strftime('%H:%M:%S')}  Failed: {f}","err")
            fr=(i+1)/tot; s.root.after(0,s._uprog,fr,i+1,tot)
        s.root.after(0,s._done)
        if fail==0: snd("ok"); s.root.after(0,s._log,f"\nDone! Moved {moved} files.","ok")
        else: s.root.after(0,s._log,f"\nDone! Moved {moved}, failed {fail}.","err")

    def _uprog(s,fr,c,t):
        s.pbar.delete("all"); w=s.pbar.winfo_width()
        s.pbar.create_rectangle(0,0,max(w*fr,1),10,fill=G,outline="")
        s.plbl.config(text=f"{c} / {t} files")

    def _done(s):
        s.busy=False; s._en(s.go_btn)
        if s.undo: s._en(s.un_btn)
        if s.folder.get()!="No folder selected": s._scan(s.folder.get())
        s.root.after(3000,lambda:s.pf.pack_forget())

    def _undo(s):
        if not s.undo: return
        snd("ui"); n=0
        for dst,src in reversed(s.undo):
            try:
                if os.path.exists(dst): os.makedirs(os.path.dirname(src),exist_ok=True); shutil.move(dst,src); n+=1
                ts=datetime.now().strftime("%H:%M:%S"); s._log(f"{ts}  Undid: {os.path.basename(dst)}","#d0a030")
            except: s._log("Undo failed","err")
        s.undo.clear(); s._dis(s.un_btn); s._log(f"\nRestored {n} files.","#d0a030"); snd("ok")
        if s.folder.get()!="No folder selected": s._scan(s.folder.get())

    def _export(s):
        if not s.log_e: messagebox.showinfo("Empty","No log to export."); return
        snd("ui")
        p=filedialog.asksaveasfilename(defaultextension=".txt",filetypes=[("Text","*.txt")],title="Export Log")
        if p:
            with open(p,"w",encoding="utf-8") as f:
                f.write("Smart File Organizer \u2014 Activity Log\n"+"="*50+"\n\n")
                for e in s.log_e: f.write(e+"\n")
            s._log(f"Exported to {os.path.basename(p)}","info"); snd("ok")

    def _settings(s):
        snd("ui")
        st=Toplevel(s.root); st.title("Settings"); st.geometry("560x560"); st.configure(bg=BG)
        st.transient(s.root); st.grab_set()
        Label(st,text="CUSTOM CATEGORIES",font=("Segoe UI",14,"bold"),bg=BG,fg=G).pack(pady=15)
        ct=Frame(st,bg=BG); ct.pack(fill=BOTH,expand=True,padx=20)
        cv=Canvas(ct,bg=BG,highlightthickness=0)
        sb=Scrollbar(ct,orient="vertical",command=cv.yview)
        sf=Frame(cv,bg=BG)
        sf.bind("<Configure>",lambda e:cv.configure(scrollregion=cv.bbox("all")))
        cv.create_window((0,0),window=sf,anchor="nw"); cv.configure(yscrollcommand=sb.set)
        cv.pack(side=LEFT,fill=BOTH,expand=True); sb.pack(side=RIGHT,fill=Y)
        ents={}
        for cat,exts in s.cfg.items():
            r=Frame(sf,bg=GL,highlightbackground=BD,highlightthickness=1); r.pack(fill=X,pady=3)
            Label(r,text=cat,font=("Segoe UI",10,"bold"),bg=GL,fg=G,width=12,anchor=W).pack(side=LEFT,padx=8,pady=6)
            e=Entry(r,font=("Consolas",10),bg=CD,fg=TX,insertbackground=G,relief=FLAT,highlightbackground=BD,highlightthickness=1)
            e.insert(0,", ".join(exts)); e.pack(side=LEFT,fill=X,expand=True,padx=8,ipady=5); ents[cat]=e
        def save():
            for c,e in ents.items(): s.cfg[c]=[x.strip() for x in e.get().split(",") if x.strip()]
            savej(CFG,s.cfg); s._log("Settings saved","info"); snd("ok"); st.destroy()
            if s.folder.get()!="No folder selected": s._scan(s.folder.get())
        s._gbtn(st,"SAVE",save,180,44).pack(pady=15)

    def _log(s,msg,tag="info"):
        s.log_e.append(msg)
        b=Frame(s.lin,bg=GL); b.pack(fill=X,pady=2,padx=4)
        cols={"ok":G,"err":"#d04040","info":"#50c0c8","#d0a030":"#d0a030"}
        col=cols.get(tag,DM)
        d=Canvas(b,width=6,height=6,bg=GL,highlightthickness=0)
        d.create_oval(0,0,6,6,fill=col,outline=""); d.pack(side=LEFT,padx=(0,8),pady=5)
        Label(b,text=msg,font=("Consolas",10),bg=GL,fg=col,anchor=W).pack(side=LEFT,fill=X)
        s.lcv.update_idletasks(); s.lcv.yview_moveto(1.0)

    def _quit(s):
        s.run=False; savej(CFG,s.cfg); savej(RECENT,s.recent); s.root.destroy()

    def run_app(s): s.root.mainloop()

if __name__=="__main__":
    App().run_app()
