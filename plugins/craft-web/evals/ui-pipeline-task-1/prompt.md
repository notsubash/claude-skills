---
schema_version: "1.1"
tags: ["task", "ui-pipeline"]
runs: 3
max_turns: 15
allowed_tools: ["Skill", "Read", "Glob", "Grep", "Write", "Edit"]
---

Plan a redesign of this landing page hero for "Lastcall", a tool that holds scheduled social posts when the product page they link to sells out. Don't write code yet; give me the plan you'd execute.

Current hero (React + Tailwind):
```tsx
<section className="text-center py-24 bg-gradient-to-r from-purple-500 to-pink-500">
  <span className="rounded-full bg-white/20 px-3 py-1 text-xs uppercase tracking-widest">✨ AI-powered</span>
  <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-pink-200">Welcome to the future of social</h1>
  <p className="mt-4">Seamlessly supercharge your workflow.</p>
  <div className="grid grid-cols-3 gap-4 mt-12">{/* three feature cards */}</div>
</section>
```
