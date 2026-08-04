import os
import sys
import json
import shutil
import time
import threading
from pathlib import Path
from datetime import datetime
from tkinter import *
from tkinter import ttk, filedialog, messagebox
from tkinterdnd2 import TkinterDnD, DND_FILES

CONFIG_FILE = "organizer_config.json"
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
    },
    "theme": "dark"
}

class Particle:
    def __init__(self, canvas_w, canvas_h):
        self.x = 0
        self.y = 0
        self.size = 0
        self.speed_x = 0
        self.speed_y = 0
        self.opacity = 0
        self.color = ""
        self.canvas_w = canvas_w
        self.canvas_h = canvas_h
        self.reset()

    def reset(self):
        import random
        self.x = random.randint(0, self.canvas_w)
        self.y = random.randint(0, self.canvas_h)
        self.size = random.randint(1, 3)
        self.speed_x = random.uniform(-0.3, 0.3)
        self.speed_y = random.uniform(-0.3, 0.3)
        self.opacity = random.randint(30, 100)
        colors = ["#00e89d", "#a855f7", "#00e5ff", "#ff006e", "#ffb347"]
        self.color = random.choice(colors)

    def update(self, mx, my):
        dx = (mx - self.x) * 0.00008
        dy = (my - self.y) * 0.00008
        self.x += self.speed_x + dx
        self.y += self.speed_y + dy
        if self.x < 0 or self.x > self.canvas_w:
            self.speed_x *= -1
        if self.y < 0 or self.y > self.canvas_h:
            self.speed_y *= -1


class SmartFileOrganizer:
    def __init__(self):
        self.root = TkinterDnD.Tk()
        self.root.title("Smart File Organizer")
        self.root.geometry("900x700")
        self.root.minsize(800, 600)
        self.root.configure(bg="#0a0e1a")

        self.config = self.load_config()
        self.selected_folder = StringVar(value="No folder selected")
        self.file_stats = {}
        self.undo_stack = []
        self.log_entries = []
        self.is_organizing = False
        self.mouse_x = 0
        self.mouse_y = 0
        self.particles = []
        self.anim_running = True

        self.setup_ui()
        self.setup_drop_target()
        self.animate_background()
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

    def setup_ui(self):
        self.main_frame = Frame(self.root, bg="#0a0e1a")
        self.main_frame.pack(fill=BOTH, expand=True)

        self.bg_canvas = Canvas(self.main_frame, bg="#0a0e1a", highlightthickness=0)
        self.bg_canvas.place(x=0, y=0, relwidth=1, relheight=1)

        self.content_frame = Frame(self.main_frame, bg="#0a0e1a")
        self.content_frame.place(relx=0.5, rely=0.5, anchor=CENTER, relwidth=0.85, relheight=0.9)

        self.root.bind("<Motion>", self.on_mouse_move)

        self.build_header()
        self.build_folder_section()
        self.build_stats_section()
        self.build_buttons()
        self.build_log_section()

    def build_header(self):
        header = Frame(self.content_frame, bg="#0a0e1a")
        header.pack(fill=X, pady=(0, 15))

        title = Label(header, text="SMART FILE ORGANIZER",
                      font=("Segoe UI", 22, "bold"),
                      bg="#0a0e1a", fg="#00e89d")
        title.pack()

        subtitle = Label(header, text="Organize your files intelligently",
                        font=("Segoe UI", 10),
                        bg="#0a0e1a", fg="#5a6a80")
        subtitle.pack()

    def build_folder_section(self):
        folder_frame = Frame(self.content_frame, bg="#121a35",
                           highlightbackground="#1a2a4a", highlightthickness=1)
        folder_frame.pack(fill=X, pady=(0, 15), ipady=12)

        inner = Frame(folder_frame, bg="#121a35")
        inner.pack(fill=X, padx=20, pady=10)

        Label(inner, text="TARGET FOLDER",
              font=("Segoe UI", 10, "bold"),
              bg="#121a35", fg="#00e89d").pack(anchor=W)

        row = Frame(inner, bg="#121a35")
        row.pack(fill=X, pady=(8, 0))

        self.folder_label = Label(row, textvariable=self.selected_folder,
                                  font=("Consolas", 11),
                                  bg="#1a2a4a", fg="#c0d0e0",
                                  anchor=W, padx=12, pady=8)
        self.folder_label.pack(side=LEFT, fill=X, expand=True)

        browse_btn = Button(row, text="BROWSE", font=("Segoe UI", 10, "bold"),
                           bg="#00e89d", fg="#0a0e1a",
                           activebackground="#00c88a", activeforeground="#0a0e1a",
                           relief=FLAT, padx=20, pady=8,
                           cursor="hand2", command=self.browse_folder)
        browse_btn.pack(side=RIGHT, padx=(10, 0))

    def build_stats_section(self):
        self.stats_frame = Frame(self.content_frame, bg="#121a35",
                               highlightbackground="#1a2a4a", highlightthickness=1)
        self.stats_frame.pack(fill=X, pady=(0, 15), ipady=12)

        inner = Frame(self.stats_frame, bg="#121a35")
        inner.pack(fill=X, padx=20, pady=10)

        Label(inner, text="FILE ANALYSIS",
              font=("Segoe UI", 10, "bold"),
              bg="#121a35", fg="#00e89d").pack(anchor=W)

        self.stats_grid = Frame(inner, bg="#121a35")
        self.stats_grid.pack(fill=X, pady=(10, 0))

        self.stat_labels = {}
        categories = ["Total", "Images", "Documents", "Videos", "Audio", "Code", "Other"]
        colors = ["#00e89d", "#a855f7", "#00e5ff", "#ff006e", "#ffb347", "#6c5ce7", "#5a6a80"]

        for i, cat in enumerate(categories):
            card = Frame(self.stats_grid, bg="#1a2a4a",
                        highlightbackground="#2a3a5a", highlightthickness=1)
            card.grid(row=i // 4, column=i % 4, padx=5, pady=5, sticky="nsew")

            val = Label(card, text="0", font=("Segoe UI", 18, "bold"),
                       bg="#1a2a4a", fg=colors[i])
            val.pack(pady=(8, 0))

            lbl = Label(card, text=cat, font=("Segoe UI", 9),
                       bg="#1a2a4a", fg="#7a8ba8")
            lbl.pack(pady=(0, 8))

            self.stat_labels[cat] = val

        for i in range(4):
            self.stats_grid.columnconfigure(i, weight=1)

    def build_buttons(self):
        btn_frame = Frame(self.content_frame, bg="#0a0e1a")
        btn_frame.pack(fill=X, pady=(0, 15))

        self.organize_btn = Button(btn_frame, text="ORGANIZE FILES",
                                  font=("Segoe UI", 13, "bold"),
                                  bg="#00e89d", fg="#0a0e1a",
                                  activebackground="#00c88a", activeforeground="#0a0e1a",
                                  relief=FLAT, padx=40, pady=12,
                                  cursor="hand2", command=self.organize_files)
        self.organize_btn.pack(side=LEFT, padx=(0, 10))

        self.undo_btn = Button(btn_frame, text="UNDO",
                              font=("Segoe UI", 11, "bold"),
                              bg="#1a2a4a", fg="#ff006e",
                              activebackground="#2a3a5a", activeforeground="#ff006e",
                              relief=FLAT, padx=20, pady=10,
                              cursor="hand2", command=self.undo_organize,
                              state=DISABLED)
        self.undo_btn.pack(side=LEFT, padx=(0, 10))

        self.export_btn = Button(btn_frame, text="EXPORT LOG",
                                font=("Segoe UI", 11, "bold"),
                                bg="#1a2a4a", fg="#a855f7",
                                activebackground="#2a3a5a", activeforeground="#a855f7",
                                relief=FLAT, padx=20, pady=10,
                                cursor="hand2", command=self.export_log)
        self.export_btn.pack(side=LEFT)

        self.settings_btn = Button(btn_frame, text="SETTINGS",
                                  font=("Segoe UI", 11, "bold"),
                                  bg="#1a2a4a", fg="#00e5ff",
                                  activebackground="#2a3a5a", activeforeground="#00e5ff",
                                  relief=FLAT, padx=20, pady=10,
                                  cursor="hand2", command=self.open_settings)
        self.settings_btn.pack(side=LEFT, padx=(10, 0))

    def build_log_section(self):
        log_frame = Frame(self.content_frame, bg="#121a35",
                         highlightbackground="#1a2a4a", highlightthickness=1)
        log_frame.pack(fill=BOTH, expand=True)

        inner = Frame(log_frame, bg="#121a35")
        inner.pack(fill=BOTH, expand=True, padx=20, pady=10)

        Label(inner, text="ACTIVITY LOG",
              font=("Segoe UI", 10, "bold"),
              bg="#121a35", fg="#00e89d").pack(anchor=W)

        log_container = Frame(inner, bg="#0a0e1a")
        log_container.pack(fill=BOTH, expand=True, pady=(8, 0))

        self.log_text = Text(log_container, bg="#0a0e1a", fg="#7a8ba8",
                            font=("Consolas", 10), relief=FLAT,
                            insertbackground="#00e89d", selectbackground="#1a2a4a",
                            state=DISABLED, wrap=WORD)
        scrollbar = Scrollbar(log_container, command=self.log_text.yview,
                            bg="#1a2a4a", troughcolor="#0a0e1a")
        self.log_text.configure(yscrollcommand=scrollbar.set)

        scrollbar.pack(side=RIGHT, fill=Y)
        self.log_text.pack(fill=BOTH, expand=True)

        self.log_text.tag_configure("time", foreground="#5a6a80")
        self.log_text.tag_configure("moved", foreground="#00e89d")
        self.log_text.tag_configure("error", foreground="#ff006e")
        self.log_text.tag_configure("info", foreground="#00e5ff")
        self.log_text.tag_configure("undo", foreground="#ffb347")

    def setup_drop_target(self):
        self.root.drop_target_register(DND_FILES)
        self.root.dnd_bind("<<Drop>>", self.on_drop)

    def on_drop(self, event):
        path = event.data.strip("{}")
        if os.path.isdir(path):
            self.selected_folder.set(path)
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
            import random
            for _ in range(40):
                p = Particle(w, h)
                self.particles.append(p)

        for p in self.particles:
            p.canvas_w = w
            p.canvas_h = h
            p.update(self.mouse_x, self.mouse_y)
            self.bg_canvas.create_oval(
                p.x - p.size, p.y - p.size,
                p.x + p.size, p.y + p.size,
                fill=p.color, outline="", stipple="gray25"
            )

        for i, p1 in enumerate(self.particles):
            for p2 in self.particles[i+1:i+6]:
                dist = ((p1.x - p2.x)**2 + (p1.y - p2.y)**2) ** 0.5
                if dist < 120:
                    opacity = int(max(0, 40 - dist * 0.3))
                    self.bg_canvas.create_line(
                        p1.x, p1.y, p2.x, p2.y,
                        fill="#00e89d", width=1
                    )

        glow_x = w * 0.3 + (self.mouse_x - w * 0.3) * 0.05
        glow_y = h * 0.3 + (self.mouse_y - h * 0.3) * 0.05
        self.bg_canvas.create_oval(
            glow_x - 200, glow_y - 200,
            glow_x + 200, glow_y + 200,
            fill="", outline="#00e89d", width=1
        )

        self.root.after(33, self.animate_background)

    def browse_folder(self):
        folder = filedialog.askdirectory(title="Select folder to organize")
        if folder:
            self.selected_folder.set(folder)
            self.scan_folder(folder)

    def scan_folder(self, folder):
        self.file_stats = {cat: 0 for cat in self.config["categories"]}
        self.file_stats["Other"] = 0

        try:
            files = [f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))]
        except Exception as e:
            self.log(f"Error scanning folder: {e}", "error")
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
        self.stat_labels["Total"].config(text=str(total))
        for cat in ["Images", "Documents", "Videos", "Audio", "Code", "Other"]:
            self.stat_labels[cat].config(text=str(self.file_stats.get(cat, 0)))

        self.log(f"Scanned {folder} — Found {total} files", "info")

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

        self.is_organizing = True
        self.organize_btn.config(state=DISABLED, text="ORGANIZING...")

        thread = threading.Thread(target=self._organize_thread, args=(folder,))
        thread.daemon = True
        thread.start()

    def _organize_thread(self, folder):
        self.undo_stack.clear()
        moved = 0

        try:
            files = [f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))]
        except Exception as e:
            self.log(f"Error: {e}", "error")
            self.root.after(0, self._organize_done)
            return

        for f in files:
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
                self.root.after(0, self.log,
                    f"{timestamp}  Moved {f} → {category}", "moved")
            except Exception as e:
                self.root.after(0, self.log,
                    f"{timestamp}  Failed: {f} — {e}", "error")

        self.root.after(0, self._organize_done)
        self.root.after(0, self.log,
            f"\nDone! Moved {moved} files.", "info")

    def _organize_done(self):
        self.is_organizing = False
        self.organize_btn.config(state=NORMAL, text="ORGANIZE FILES")
        if self.undo_stack:
            self.undo_btn.config(state=NORMAL)
        if self.selected_folder.get() != "No folder selected":
            self.scan_folder(self.selected_folder.get())

    def undo_organize(self):
        if not self.undo_stack:
            return

        undone = 0
        for dest, src in reversed(self.undo_stack):
            try:
                if os.path.exists(dest):
                    os.makedirs(os.path.dirname(src), exist_ok=True)
                    shutil.move(dest, src)
                    undone += 1
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    self.log(f"{timestamp}  Undid: {os.path.basename(dest)} → back", "undo")
            except Exception as e:
                self.log(f"Undo failed: {e}", "error")

        self.undo_stack.clear()
        self.undo_btn.config(state=DISABLED)
        self.log(f"\nUndone! Restored {undone} files.", "undo")

        if self.selected_folder.get() != "No folder selected":
            self.scan_folder(self.selected_folder.get())

    def export_log(self):
        if not self.log_entries:
            messagebox.showinfo("No Log", "No log entries to export.")
            return

        path = filedialog.asksaveasfilename(
            defaultextension=".txt",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
            title="Export Log"
        )
        if path:
            with open(path, "w", encoding="utf-8") as f:
                f.write("Smart File Organizer — Activity Log\n")
                f.write("=" * 50 + "\n\n")
                for entry in self.log_entries:
                    f.write(f"{entry}\n")
            self.log(f"Log exported to {path}", "info")

    def open_settings(self):
        settings = Toplevel(self.root)
        settings.title("Settings")
        settings.geometry("500x500")
        settings.configure(bg="#0a0e1a")
        settings.transient(self.root)
        settings.grab_set()

        Label(settings, text="CUSTOM CATEGORIES",
              font=("Segoe UI", 14, "bold"),
              bg="#0a0e1a", fg="#00e89d").pack(pady=15)

        container = Frame(settings, bg="#0a0e1a")
        container.pack(fill=BOTH, expand=True, padx=20)

        canvas = Canvas(container, bg="#0a0e1a", highlightthickness=0)
        scrollbar = Scrollbar(container, orient="vertical", command=canvas.yview)
        scroll_frame = Frame(canvas, bg="#0a0e1a")

        scroll_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scroll_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side=LEFT, fill=BOTH, expand=True)
        scrollbar.pack(side=RIGHT, fill=Y)

        entries = {}
        for cat, exts in self.config["categories"].items():
            row = Frame(scroll_frame, bg="#121a35")
            row.pack(fill=X, pady=3)

            Label(row, text=cat, font=("Segoe UI", 10, "bold"),
                 bg="#121a35", fg="#00e89d", width=12, anchor=W).pack(side=LEFT, padx=5)

            entry = Entry(row, font=("Consolas", 10),
                         bg="#1a2a4a", fg="#c0d0e0",
                         insertbackground="#00e89d", relief=FLAT)
            entry.insert(0, ", ".join(exts))
            entry.pack(side=LEFT, fill=X, expand=True, padx=5, ipady=4)
            entries[cat] = entry

        def save_settings():
            for cat, entry in entries.items():
                exts = [e.strip() for e in entry.get().split(",") if e.strip()]
                self.config["categories"][cat] = exts
            self.save_config()
            self.log("Settings saved", "info")
            settings.destroy()
            if self.selected_folder.get() != "No folder selected":
                self.scan_folder(self.selected_folder.get())

        Button(settings, text="SAVE", font=("Segoe UI", 11, "bold"),
              bg="#00e89d", fg="#0a0e1a",
              activebackground="#00c88a", relief=FLAT,
              padx=30, pady=8, cursor="hand2",
              command=save_settings).pack(pady=15)

    def log(self, message, tag="info"):
        self.log_entries.append(message)
        self.log_text.config(state=NORMAL)
        self.log_text.insert(END, message + "\n", tag)
        self.log_text.see(END)
        self.log_text.config(state=DISABLED)

    def on_close(self):
        self.anim_running = False
        self.save_config()
        self.root.destroy()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    app = SmartFileOrganizer()
    app.run()
