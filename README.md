# Todo List App

A simple **To-Do List** web app built with **HTML**, **CSS**, and **JavaScript**, styled using **Tailwind CSS**. The project is structured for easy customization and fast iteration, with a lightweight assets layout that keeps markup, styling, and behavior separate.

## 🚀 Project Overview

This app is designed to let users add, complete, and remove tasks in a clean interface using Tailwind CSS for styling.

## ✅ Features

- Add new todo items
- Mark todos as completed
- Remove tasks from the list
- Responsive layout using Tailwind CSS
- Custom JavaScript interactions in `assets/js/main.js`
- Optional custom CSS in `assets/css/style.css`

## 📁 Project Structure

- `index.html` - Main page markup
- `assets/css/style.css` - Custom styles and layout overrides
- `assets/js/main.js` - JavaScript logic for todo interactions

## 💻 Setup

### Option 1: Use Tailwind CSS CDN

Add Tailwind CSS via CDN by including this in your `<head>`:

```html
<script src="https://cdn.tailwindcss.com"></script>
```

This is the fastest way to get started and is ideal for small projects or prototypes.

### Option 2: Use Tailwind CSS with a build process

If you want a full Tailwind workflow, install Tailwind via npm and configure it with `tailwind.config.js`.

## 🧩 Usage

1. Open `index.html` in your browser.
2. Type a task in the input field.
3. Press the add button or hit Enter.
4. Click the checkbox or action button to mark tasks as complete.
5. Use the delete button to remove a task.

## 🎨 Styling

This project uses Tailwind CSS utility classes to build the UI layout, colors, typography, and spacing.

Use `assets/css/style.css` for any additional custom styles that Tailwind utilities do not cover.

## 🛠️ Development Tips

- Keep HTML markup semantic and accessible.
- Use Tailwind utility classes for layout and spacing.
- Use JavaScript to update the DOM and manage todo state.
- Keep custom styling minimal in `style.css` and favor Tailwind classes for consistency.

## 📌 Notes

- If you want to support persistence, extend the app by saving todos to `localStorage`.
- For a production build using Tailwind, generate a compiled CSS file and include that instead of the CDN script.

## 🙌 Next Improvements

- Add task editing
- Add filter buttons (All / Active / Completed)
- Add due dates and priority labels
- Persist todos across page reloads with `localStorage`
