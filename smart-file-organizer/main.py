import os
import sys
import json
import shutil
import time
import math
import winsound
import threading
from pathlib import Path
from datetime import datetime
from tkinter import *
from tkinter import ttk, filedialog, messagebox
from tkinterdnd2 import TkinterDnD, DND_FILES

CONFIG_FILE = "organizer_config.json"
RECENT_FILE = "recent_folders.json"
SOUND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sounds")

DEFAULT_CONFIG = {
    "categories": {
        "Images": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".ico", ".tiff", ".tif"],
        "Documents": [".pdf", ".doc", ".docx", ".txt", ".xlsx", ".xls", ".pptx", ".ppt", ".csv", ".rtf", ".odt", ".md"],
        "Videos": [".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm", ".m4v", ".mpg", ".mpeg"],
        "Audio": [".mp3", ".wav", ".flac", ".aac", ".ogg", ".wma", ".m4a", ".opus"],
        "Code": [".py", ".js", ".html", ".css", ".java", ".cpp", ".c", ".ts", ".jsx", ".tsx", ".json", ".xml"],
        "Archives": [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"],
        "Fonts": [".ttf", ".otf", ".woff", ".woff2", ".eot"],
        "Design": [".psd", ".ai", ".sketch", ".fig", ".xd"],
    }
}

GOLD = "#d4a843"
GOLD_DIM = "#a07830"
GOLD_BRIGHT = "#f0c850"
BG_DARK = "#0d0d0d"
BG_CARD = "#1a1a1a"
BG_INNER = "#141414"
TEXT = "#e0d8c8"
TEXT_DIM = "#7a7060"
BORDER = "#2a2520"
RED = "#e04040"
GREEN = "#40c060"
BLUE = "#4090d0"
PURPLE = "#9060d0"
CYAN = "#40c0d0"


def play_sound(name):
    try:
        freq_map = {"click": 800, "success": 1200, "error": 300, "drag": 600, "drop": 1000}
        freq = freq_map.get(name, 800)
        winsound.Beep(freq, 80)
    except:
        pass


class FlowParticle:
    def __init__(self, w, h):
        self.w = w
        self.h = h
        self.reset(True)

    def reset(self, init=False):
        import random
        self.x = random.randint(0, self.w) if init else -10
        self.y = random.randint(0, self.h)
        self.size = random.uniform(1.5, 3.5)
        self.base_speed = random.uniform(0.8, 2.5)
        self.speed_x = self.base_speed
        self.speed_y = random.uniform(-0.3, 0.3)
        self.wave_amp = random.uniform(10, 30)
        self.wave_freq = random.uniform(0.01, 0.03)
        self.wave_offset = random.uniform(0, math.pi * 2)
        self.opacity = random.randint(40, 120)
        self.golden = random.random() < 0.3
        if self.golden:
            self.color = GOLD
            self.opacity = random.randint(80, 160)
        else:
            colors = ["#c0a050", "#a08030", "#806020", "#605020"]
            self.color = random.choice(colors)

    def update(self, time_val, mx, my):
        self.x += self.speed_x
        self.y += self.speed_y + math.sin(time_val * self.wave_freq + self.wave_offset) * 0.5

        dx = mx - self.x
        dy = my - self.y
        dist = math.sqrt(dx*dx + dy*dy)
        if dist < 150 and dist > 0:
            force = (150 - dist) / 150 * 0.8
            self.y += dy * force * 0.02
            self.x += dx * force * 0.01

        if self.x > self.w + 20:
            self.reset()


class Overlay:
    def __init__(self, parent, on_drop):
        self.parent = parent
        self.on_drop = on_drop
        self.visible = False
        self.frame = None

    def show(self):
        if self.visible:
            return
        self.visible = True
        self.frame = Frame(self.parent, bg="#000000")
        self.frame.place(relx=0, rely=0, relwidth=1, relheight=1)

        inner = Frame(self.frame, bg="#1a1a1a",
                     highlightbackground=GOLD, highlightthickness=2)
        inner.place(relx=0.5, rely=0.5, anchor=CENTER, relwidth=0.5, relheight=0.4)

        Label(inner, text="DROP FOLDER HERE",
              font=("Segoe UI", 20, "bold"),
              bg="#1a1a1a", fg=GOLD).pack(expand=True)

        Label(inner, text="Release to scan and organize",
              font=("Segoe UI", 11),
              bg="#1a1a1a", fg=TEXT_DIM).pack(expand=True)

        self.frame.drop_target_register(DND_FILES)
        self.frame.dnd_bind("<<Drop>>", self._on_drop)
        self.frame.bind("<Button-1>", lambda e: self.hide())

    def _on_drop(self, event):
        path = event.data.strip("{}")
        self.hide()
        if os.path.isdir(path):
            self.on_drop(path)

    def hide(self):
        if self.visible and self.frame:
            self.frame.destroy()
            self.frame = None
            self.visible = False


class SmartFileOrganizer:
    def __init__(self):
        self.root = TkinterDnD.Tk()
        self.root.title("Smart File Organizer")
        self.root.geometry("920x720")
        self.root.minsize(800, 600)
        self.root.configure(bg=BG_DARK)

        self.config = self.load_config()
        self.recent_folders = self.load_recent()
        self.selected_folder = StringVar(value="No folder selected")
        self.file_stats = {}
        self.undo_stack = []
        self.log_entries = []
        self.is_organizing = False
        self.mouse_x = 0
        self.mouse_y = 0
        self.particles = []
        self.anim_running = True
        self.time_val = 0

        self.overlay = Overlay(self.root, self.on_folder_dropped)

        self.setup_ui()
        self.setup_drop_target()
        self.animate_background()
        self.typewriter_title()
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r") as f:
                    return json.load(f)
            except:
                pass
        return DEFAULT_CONFIG.copy()

    def save_config(self):
        with open(CONFIG_FILE, "w") as f:
            json.dump(self.config, f, indent=4)

    def load_recent(self):
        if os.path.exists(RECENT_FILE):
            try:
                with open(RECENT_FILE, "r") as f:
                    return json.load(f)
            except:
                pass
        return []

    def save_recent(self):
        with open(RECENT_FILE, "w") as f:
            json.dump(self.recent_folders, f)

    def add_recent(self, folder):
        if folder in self.recent_folders:
            self.recent_folders.remove(folder)
        self.recent_folders.insert(0, folder)
        self.recent_folders = self.recent_folders[:5]
        self.save_recent()
        self.update_recent_menu()

    def setup_ui(self):
        self.main_frame = Frame(self.root, bg=BG_DARK)
        self.main_frame.pack(fill=BOTH, expand=True)

        self.bg_canvas = Canvas(self.main_frame, bg=BG_DARK, highlightthickness=0)
        self.bg_canvas.place(x=0, y=0, relwidth=1, relheight=1)

        self.content_frame = Frame(self.main_frame, bg=BG_DARK)
        self.content_frame.place(relx=0.5, rely=0.5, anchor=CENTER, relwidth=0.85, relheight=0.92)

        self.root.bind("<Motion>", self.on_mouse_move)
        self.root.bind("<Control-Return>", lambda e: self.organize_files())

        self.build_header()
        self.build_folder_section()
        self.build_stats_section()
        self.build_progress_section()
        self.build_buttons()
        self.build_log_section()

    def build_header(self):
        header = Frame(self.content_frame, bg=BG_DARK)
        header.pack(fill=X, pady=(0, 15))

        self.title_text = "SMART FILE ORGANIZER"
        self.title_display = ""
        self.title_label = Label(header, text="",
                                font=("Segoe UI", 24, "bold"),
                                bg=BG_DARK, fg=GOLD)
        self.title_label.pack()

        self.subtitle_label = Label(header, text="Intelligent file management",
                                   font=("Segoe UI", 10),
                                   bg=BG_DARK, fg=TEXT_DIM)
        self.subtitle_label.pack()

    def typewriter_title(self):
        self.tw_index = 0
        self.twDeleting = False
        self._typewriter_tick()

    def _typewriter_tick(self):
        if not self.anim_running:
            return

        if not self.twDeleting:
            self.tw_index += 1
            self.title_display = self.title_text[:self.tw_index]
            self.title_label.config(text=self.title_display)

            if self.tw_index >= len(self.title_text):
                self.root.after(2000, self._start_delete)
                return
            self.root.after(80, self._typewriter_tick)
        else:
            self.tw_index -= 1
            self.title_display = self.title_text[:self.tw_index]
            self.title_label.config(text=self.title_display)

            if self.tw_index <= 0:
                self.twDeleting = False
                self.root.after(500, self._typewriter_tick)
                return
            self.root.after(40, self._typewriter_tick)

    def _start_delete(self):
        self.twDeleting = True
        self._typewriter_tick()

    def build_folder_section(self):
        folder_frame = Frame(self.content_frame, bg=BG_CARD,
                           highlightbackground=BORDER, highlightthickness=1)
        folder_frame.pack(fill=X, pady=(0, 15), ipady=12)

        inner = Frame(folder_frame, bg=BG_CARD)
        inner.pack(fill=X, padx=20, pady=10)

        Label(inner, text="TARGET FOLDER",
              font=("Segoe UI", 10, "bold"),
              bg=BG_CARD, fg=GOLD).pack(anchor=W)

        row = Frame(inner, bg=BG_CARD)
        row.pack(fill=X, pady=(8, 0))

        self.folder_label = Label(row, textvariable=self.selected_folder,
                                  font=("Consolas", 11),
                                  bg=BG_INNER, fg=TEXT,
                                  anchor=W, padx=12, pady=8)
        self.folder_label.pack(side=LEFT, fill=X, expand=True)

        self.recent_btn = Button(row, text="\u25BC", font=("Segoe UI", 8),
                                bg=BG_INNER, fg=GOLD_DIM,
                                activebackground=BORDER, activeforeground=GOLD,
                                relief=FLAT, padx=8, pady=6,
                                cursor="hand2", command=self.show_recent_menu)
        self.recent_btn.pack(side=RIGHT, padx=(5, 0))

        browse_btn = Button(row, text="BROWSE", font=("Segoe UI", 10, "bold"),
                           bg=GOLD, fg=BG_DARK,
                           activebackground=GOLD_BRIGHT, activeforeground=BG_DARK,
                           relief=FLAT, padx=20, pady=8,
                           cursor="hand2", command=self.browse_folder)
        browse_btn.bind("<Enter>", lambda e: browse_btn.config(bg=GOLD_BRIGHT))
        browse_btn.bind("<Leave>", lambda e: browse_btn.config(bg=GOLD))
        browse_btn.pack(side=RIGHT, padx=(10, 0))

    def show_recent_menu(self):
        play_sound("click")
        menu = Menu(self.root, bg=BG_CARD, fg=TEXT, activebackground=GOLD_DIM,
                   activeforeground=BG_DARK, relief=FLAT, borderwidth=0)
        if not self.recent_folders:
            menu.add_command(label="No recent folders", state=DISABLED)
        else:
            for folder in self.recent_folders:
                menu.add_command(label=folder,
                               command=lambda f=folder: self.select_recent(f))
        menu.tk_popup(self.recent_btn.winfo_rootx(),
                     self.recent_btn.winfo_rooty() + 30)

    def update_recent_menu(self):
        pass

    def select_recent(self, folder):
        if os.path.isdir(folder):
            self.selected_folder.set(folder)
            self.scan_folder(folder)
            play_sound("click")

    def build_stats_section(self):
        self.stats_frame = Frame(self.content_frame, bg=BG_CARD,
                               highlightbackground=BORDER, highlightthickness=1)
        self.stats_frame.pack(fill=X, pady=(0, 15), ipady=12)

        inner = Frame(self.stats_frame, bg=BG_CARD)
        inner.pack(fill=X, padx=20, pady=10)

        Label(inner, text="FILE ANALYSIS",
              font=("Segoe UI", 10, "bold"),
              bg=BG_CARD, fg=GOLD).pack(anchor=W)

        self.stats_grid = Frame(inner, bg=BG_CARD)
        self.stats_grid.pack(fill=X, pady=(10, 0))

        self.stat_cards = {}
        categories = ["Total", "Images", "Documents", "Videos", "Audio", "Code", "Other"]
        card_colors = [GOLD, "#c08030", "#a07020", "#806020", "#605020", "#504020", "#404040"]

        for i, cat in enumerate(categories):
            card = Frame(self.stats_grid, bg=BG_INNER,
                        highlightbackground=BORDER, highlightthickness=1,
                        cursor="hand2")
            card.grid(row=i // 4, column=i % 4, padx=5, pady=5, sticky="nsew")
            card.bind("<Enter>", lambda e, c=card: c.config(highlightbackground=GOLD_DIM))
            card.bind("<Leave>", lambda e, c=card: c.config(highlightbackground=BORDER))

            val = Label(card, text="0", font=("Segoe UI", 20, "bold"),
                       bg=BG_INNER, fg=card_colors[i])
            val.pack(pady=(10, 2))

            lbl = Label(card, text=cat, font=("Segoe UI", 9),
                       bg=BG_INNER, fg=TEXT_DIM)
            lbl.pack(pady=(0, 10))

            self.stat_cards[cat] = {"frame": card, "value": val, "color": card_colors[i]}

        for i in range(4):
            self.stats_grid.columnconfigure(i, weight=1)

    def build_progress_section(self):
        self.progress_frame = Frame(self.content_frame, bg=BG_DARK)

        self.progress_bar_bg = Frame(self.progress_frame, bg=BG_INNER,
                                    highlightbackground=BORDER, highlightthickness=1)
        self.progress_bar_bg.pack(fill=X, ipady=3)

        self.progress_fill = Frame(self.progress_bar_bg, bg=GOLD, height=6)
        self.progress_fill.place(relx=0, rely=0, relwidth=0, relheight=1)

        self.progress_label = Label(self.progress_frame, text="",
                                   font=("Segoe UI", 9),
                                   bg=BG_DARK, fg=TEXT_DIM)
        self.progress_label.pack(anchor=W, pady=(5, 0))

    def build_buttons(self):
        btn_frame = Frame(self.content_frame, bg=BG_DARK)
        btn_frame.pack(fill=X, pady=(0, 15))

        self.organize_btn = Button(btn_frame, text="ORGANIZE FILES",
                                  font=("Segoe UI", 13, "bold"),
                                  bg=GOLD, fg=BG_DARK,
                                  activebackground=GOLD_BRIGHT, activeforeground=BG_DARK,
                                  relief=FLAT, padx=40, pady=12,
                                  cursor="hand2", command=self.organize_files)
        self.organize_btn.bind("<Enter>", lambda e: self.organize_btn.config(bg=GOLD_BRIGHT))
        self.organize_btn.bind("<Leave>", lambda e: self.organize_btn.config(bg=GOLD))
        self.organize_btn.pack(side=LEFT, padx=(0, 10))

        self.undo_btn = Button(btn_frame, text="UNDO",
                              font=("Segoe UI", 11, "bold"),
                              bg=BG_INNER, fg=RED,
                              activebackground=BG_CARD, activeforeground=RED,
                              relief=FLAT, padx=20, pady=10,
                              cursor="hand2", command=self.undo_organize,
                              state=DISABLED)
        self.undo_btn.pack(side=LEFT, padx=(0, 10))

        self.export_btn = Button(btn_frame, text="EXPORT LOG",
                                font=("Segoe UI", 11, "bold"),
                                bg=BG_INNER, fg=PURPLE,
                                activebackground=BG_CARD, activeforeground=PURPLE,
                                relief=FLAT, padx=20, pady=10,
                                cursor="hand2", command=self.export_log)
        self.export_btn.pack(side=LEFT)

        self.settings_btn = Button(btn_frame, text="SETTINGS",
                                  font=("Segoe UI", 11, "bold"),
                                  bg=BG_INNER, fg=CYAN,
                                  activebackground=BG_CARD, activeforeground=CYAN,
                                  relief=FLAT, padx=20, pady=10,
                                  cursor="hand2", command=self.open_settings)
        self.settings_btn.pack(side=LEFT, padx=(10, 0))

    def build_log_section(self):
        log_frame = Frame(self.content_frame, bg=BG_CARD,
                         highlightbackground=BORDER, highlightthickness=1)
        log_frame.pack(fill=BOTH, expand=True)

        inner = Frame(log_frame, bg=BG_CARD)
        inner.pack(fill=BOTH, expand=True, padx=20, pady=10)

        Label(inner, text="ACTIVITY LOG",
              font=("Segoe UI", 10, "bold"),
              bg=BG_CARD, fg=GOLD).pack(anchor=W)

        log_container = Frame(inner, bg=BG_INNER)
        log_container.pack(fill=BOTH, expand=True, pady=(8, 0))

        self.log_canvas = Canvas(log_container, bg=BG_INNER, highlightthickness=0)
        scrollbar = Scrollbar(log_container, command=self.log_canvas.yview,
                            bg=BORDER, troughcolor=BG_INNER)
        self.log_inner = Frame(self.log_canvas, bg=BG_INNER)

        self.log_inner.bind("<Configure>",
                          lambda e: self.log_canvas.configure(scrollregion=self.log_canvas.bbox("all")))
        self.log_canvas.create_window((0, 0), window=self.log_inner, anchor="nw")
        self.log_canvas.configure(yscrollcommand=scrollbar.set)

        scrollbar.pack(side=RIGHT, fill=Y)
        self.log_canvas.pack(fill=BOTH, expand=True)

        self.log_canvas.bind("<Enter>",
                            lambda e: self.log_canvas.bind_all("<MouseWheel>", self._on_log_scroll))
        self.log_canvas.bind("<Leave>",
                            lambda e: self.log_canvas.unbind_all("<MouseWheel>"))

    def _on_log_scroll(self, event):
        self.log_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    def setup_drop_target(self):
        self.root.drop_target_register(DND_FILES)
        self.root.dnd_bind("<<Drop>>", self.on_drop)
        self.root.dnd_bind("<<DragEnter>>", self.on_drag_enter)
        self.root.dnd_bind("<<DragLeave>>", self.on_drag_leave)

    def on_drag_enter(self, event):
        self.overlay.show()

    def on_drag_leave(self, event):
        pass

    def on_drop(self, event):
        self.overlay.hide()
        path = event.data.strip("{}")
        if os.path.isdir(path):
            self.selected_folder.set(path)
            self.add_recent(path)
            self.scan_folder(path)

    def on_folder_dropped(self, path):
        self.selected_folder.set(path)
        self.add_recent(path)
        self.scan_folder(path)

    def on_mouse_move(self, event):
        self.mouse_x = event.x
        self.mouse_y = event.y

    def animate_background(self):
        if not self.anim_running:
            return

        self.bg_canvas.delete("all")
        w = self.root.winfo_width()
        h = self.root.winfo_height()

        if not self.particles:
            for _ in range(35):
                self.particles.append(FlowParticle(w, h))

        self.time_val += 1

        for p in self.particles:
            p.w = w
            p.h = h
            p.update(self.time_val, self.mouse_x, self.mouse_y)

            glow = 1.0
            dx = self.mouse_x - p.x
            dy = self.mouse_y - p.y
            dist = math.sqrt(dx*dx + dy*dy)
            if dist < 120:
                glow = 1.0 + (120 - dist) / 120 * 0.5

            size = p.size * glow
            self.bg_canvas.create_oval(
                p.x - size, p.y - size,
                p.x + size, p.y + size,
                fill=p.color, outline=""
            )

        for i, p1 in enumerate(self.particles):
            for p2 in self.particles[i+1:i+4]:
                dist = ((p1.x - p2.x)**2 + (p1.y - p2.y)**2) ** 0.5
                if dist < 100:
                    self.bg_canvas.create_line(
                        p1.x, p1.y, p2.x, p2.y,
                        fill=GOLD_DIM, width=1
                    )

        glow_x = w * 0.2 + (self.mouse_x - w * 0.2) * 0.03
        glow_y = h * 0.3 + (self.mouse_y - h * 0.3) * 0.03
        for r in range(3):
            self.bg_canvas.create_oval(
                glow_x - 150 - r*50, glow_y - 150 - r*50,
                glow_x + 150 + r*50, glow_y + 150 + r*50,
                fill="", outline=GOLD_DIM, width=1
            )

        self.root.after(33, self.animate_background)

    def browse_folder(self):
        play_sound("click")
        folder = filedialog.askdirectory(title="Select folder to organize")
        if folder:
            self.selected_folder.set(folder)
            self.add_recent(folder)
            self.scan_folder(folder)

    def scan_folder(self, folder):
        self.file_stats = {}
        for cat in self.config["categories"]:
            self.file_stats[cat] = 0
        self.file_stats["Other"] = 0

        try:
            files = [f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))]
        except Exception as e:
            self.log_chat(f"Error scanning: {e}", "error")
            return

        for f in files:
            ext = os.path.splitext(f)[1].lower()
            found = False
            for cat, exts in self.config["categories"].items():
                if ext in exts:
                    self.file_stats[cat] = self.file_stats.get(cat, 0) + 1
                    found = True
                    break
            if not found:
                self.file_stats["Other"] = self.file_stats.get("Other", 0) + 1

        total = sum(self.file_stats.values())
        self._animate_stat("Total", total)
        for cat in ["Images", "Documents", "Videos", "Audio", "Code", "Other"]:
            self._animate_stat(cat, self.file_stats.get(cat, 0))

        self.log_chat(f"Scanned {os.path.basename(folder)} — {total} files found", "info")

    def _animate_stat(self, cat, target):
        card = self.stat_cards.get(cat)
        if not card:
            return
        current = int(card["value"].cget("text") or "0")
        if current == target:
            return
        step = 1 if target > current else -1
        def _tick(c=current):
            if c == target:
                card["value"].config(text=str(target))
                return
            c += step
            card["value"].config(text=str(c))
            self.root.after(30, _tick, c)
        _tick()

    def get_safe_path(self, dest_folder, filename):
        dest = os.path.join(dest_folder, filename)
        if not os.path.exists(dest):
            return dest
        name, ext = os.path.splitext(filename)
        counter = 1
        while os.path.exists(dest):
            dest = os.path.join(dest_folder, f"{name} ({counter}){ext}")
            counter += 1
        return dest

    def organize_files(self):
        folder = self.selected_folder.get()
        if folder == "No folder selected" or not os.path.isdir(folder):
            messagebox.showwarning("No Folder", "Please select a folder first!")
            return
        if self.is_organizing:
            return

        play_sound("click")
        self.is_organizing = True
        self.organize_btn.config(state=DISABLED, text="ORGANIZING...")
        self.progress_frame.pack(fill=X, pady=(0, 10))
        self.progress_label.config(text="Preparing...")

        thread = threading.Thread(target=self._organize_thread, args=(folder,))
        thread.daemon = True
        thread.start()

    def _organize_thread(self, folder):
        self.undo_stack.clear()
        moved = 0
        failed = 0

        try:
            files = [f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))]
        except Exception as e:
            self.root.after(0, self.log_chat, f"Error: {e}", "error")
            self.root.after(0, self._organize_done)
            return

        total = len(files)
        self.root.after(0, self.progress_label.config, {"text": f"0 / {total} files"})

        for i, f in enumerate(files):
            ext = os.path.splitext(f)[1].lower()
            category = "Other"
            for cat, exts in self.config["categories"].items():
                if ext in exts:
                    category = cat
                    break

            dest_dir = os.path.join(folder, category)
            os.makedirs(dest_dir, exist_ok=True)

            src = os.path.join(folder, f)
            dest = self.get_safe_path(dest_dir, f)

            try:
                shutil.move(src, dest)
                self.undo_stack.append((dest, src))
                moved += 1
                timestamp = datetime.now().strftime("%H:%M:%S")
                self.root.after(0, self.log_chat,
                    f"{timestamp}  {f} \u2192 {category}", "moved")
            except Exception as e:
                failed += 1
                self.root.after(0, self.log_chat,
                    f"{datetime.now().strftime('%H:%M:%S')}  Failed: {f}", "error")

            progress = (i + 1) / total
            self.root.after(0, self._update_progress, progress, i + 1, total)

        self.root.after(0, self._organize_done)
        if failed == 0:
            play_sound("success")
            self.root.after(0, self.log_chat, f"\nDone! Moved {moved} files.", "success")
        else:
            self.root.after(0, self.log_chat, f"\nDone! Moved {moved}, failed {failed}.", "error")

    def _update_progress(self, fraction, current, total):
        self.progress_fill.place(relx=0, rely=0, relwidth=fraction, relheight=1)
        self.progress_label.config(text=f"{current} / {total} files")

    def _organize_done(self):
        self.is_organizing = False
        self.organize_btn.config(state=NORMAL, text="ORGANIZE FILES")
        if self.undo_stack:
            self.undo_btn.config(state=NORMAL)
        if self.selected_folder.get() != "No folder selected":
            self.scan_folder(self.selected_folder.get())
        self.root.after(2000, lambda: self.progress_frame.pack_forget())

    def undo_organize(self):
        if not self.undo_stack:
            return

        play_sound("click")
        undone = 0
        for dest, src in reversed(self.undo_stack):
            try:
                if os.path.exists(dest):
                    os.makedirs(os.path.dirname(src), exist_ok=True)
                    shutil.move(dest, src)
                    undone += 1
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    self.log_chat(f"{timestamp}  Undid: {os.path.basename(dest)}", "undo")
            except Exception as e:
                self.log_chat(f"Undo failed: {e}", "error")

        self.undo_stack.clear()
        self.undo_btn.config(state=DISABLED)
        self.log_chat(f"\nRestored {undone} files.", "undo")
        play_sound("success")

        if self.selected_folder.get() != "No folder selected":
            self.scan_folder(self.selected_folder.get())

    def export_log(self):
        if not self.log_entries:
            messagebox.showinfo("No Log", "No log entries to export.")
            return

        play_sound("click")
        path = filedialog.asksaveasfilename(
            defaultextension=".txt",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
            title="Export Log"
        )
        if path:
            with open(path, "w", encoding="utf-8") as f:
                f.write("Smart File Organizer - Activity Log\n")
                f.write("=" * 50 + "\n\n")
                for entry in self.log_entries:
                    f.write(f"{entry}\n")
            self.log_chat(f"Log exported to {os.path.basename(path)}", "info")
            play_sound("success")

    def open_settings(self):
        play_sound("click")
        settings = Toplevel(self.root)
        settings.title("Settings")
        settings.geometry("520x520")
        settings.configure(bg=BG_DARK)
        settings.transient(self.root)
        settings.grab_set()

        Label(settings, text="CUSTOM CATEGORIES",
              font=("Segoe UI", 14, "bold"),
              bg=BG_DARK, fg=GOLD).pack(pady=15)

        container = Frame(settings, bg=BG_DARK)
        container.pack(fill=BOTH, expand=True, padx=20)

        canvas = Canvas(container, bg=BG_DARK, highlightthickness=0)
        scrollbar = Scrollbar(container, orient="vertical", command=canvas.yview)
        scroll_frame = Frame(canvas, bg=BG_DARK)

        scroll_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scroll_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side=LEFT, fill=BOTH, expand=True)
        scrollbar.pack(side=RIGHT, fill=Y)

        entries = {}
        for cat, exts in self.config["categories"].items():
            row = Frame(scroll_frame, bg=BG_INNER)
            row.pack(fill=X, pady=3)

            Label(row, text=cat, font=("Segoe UI", 10, "bold"),
                 bg=BG_INNER, fg=GOLD, width=12, anchor=W).pack(side=LEFT, padx=5)

            entry = Entry(row, font=("Consolas", 10),
                         bg=BG_CARD, fg=TEXT,
                         insertbackground=GOLD, relief=FLAT)
            entry.insert(0, ", ".join(exts))
            entry.pack(side=LEFT, fill=X, expand=True, padx=5, ipady=4)
            entries[cat] = entry

        def save_settings():
            for cat, entry in entries.items():
                exts = [e.strip() for e in entry.get().split(",") if e.strip()]
                self.config["categories"][cat] = exts
            self.save_config()
            self.log_chat("Settings saved", "info")
            play_sound("success")
            settings.destroy()
            if self.selected_folder.get() != "No folder selected":
                self.scan_folder(self.selected_folder.get())

        Button(settings, text="SAVE", font=("Segoe UI", 11, "bold"),
              bg=GOLD, fg=BG_DARK,
              activebackground=GOLD_BRIGHT, relief=FLAT,
              padx=30, pady=8, cursor="hand2",
              command=save_settings).pack(pady=15)

    def log_chat(self, message, tag="info"):
        self.log_entries.append(message)

        bubble = Frame(self.log_inner, bg=BG_INNER)
        bubble.pack(fill=X, pady=2, padx=5)

        color_map = {
            "moved": GREEN,
            "error": RED,
            "info": CYAN,
            "undo": "#d0a030",
            "success": GOLD
        }
        color = color_map.get(tag, TEXT_DIM)

        dot = Canvas(bubble, width=8, height=8, bg=BG_INNER, highlightthickness=0)
        dot.create_oval(1, 1, 7, 7, fill=color, outline="")
        dot.pack(side=LEFT, padx=(0, 8), pady=4)

        Label(bubble, text=message, font=("Consolas", 10),
             bg=BG_INNER, fg=color, anchor=W).pack(side=LEFT, fill=X)

        self.log_canvas.update_idletasks()
        self.log_canvas.yview_moveto(1.0)

    def on_close(self):
        self.anim_running = False
        self.save_config()
        self.save_recent()
        self.root.destroy()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    app = SmartFileOrganizer()
    app.run()
