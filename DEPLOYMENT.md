# Solar Truck Project - Deployment Guide

## 🚀 Deploy to GitHub Pages

### Step 1: Create GitHub Repository
1. Go to [GitHub.com](https://github.com) and create a new repository
2. Name it something like `solar-truck-project` or `dpst1071-solar-truck`
3. Make it public (required for free GitHub Pages)
4. Don't initialize with README (we already have files)

### Step 2: Upload Files to GitHub
1. **Option A: Using GitHub Web Interface**
   - Click "uploading an existing file"
   - Drag and drop all your project files:
     - `index.html`
     - `styles.css`
     - `script.js`
     - `pdfs/` folder (create this folder and add your PDF files)

2. **Option B: Using Git Command Line**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Solar Truck Project"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select **Deploy from a branch**
5. Select **main** branch and **/ (root)** folder
6. Click **Save**

### Step 4: Access Your Website
- Your website will be available at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`
- It may take a few minutes to deploy initially

## 📁 GitHub-Based Data Storage

### Simple and Reliable Approach
Your project now uses **localStorage** for data persistence, which is:
- ✅ **Simple**: No external dependencies
- ✅ **Reliable**: Works offline and online
- ✅ **Fast**: Instant data access
- ✅ **Private**: Data stays in user's browser

### PDF Storage Structure
```
your-repository/
├── index.html
├── styles.css
├── script.js
├── pdfs/
│   ├── Concept Generation Guide.pdf
│   ├── Capacitors and Motors.pdf
│   └── Project Brief.pdf
└── README.md
```

## 🎯 Features Now Working

### ✅ PDF Viewer Integration
- **View PDFs**: Click "View PDF" button to open PDFs in browser
- **Repository PDFs**: PDFs stored in the `pdfs/` folder are directly accessible
- **Upload PDFs**: Upload local PDF files (stored as object URLs)
- **PDF Detection**: Automatic detection of PDF links

### ✅ Data Management
- **Events**: Add, edit, delete events with time and location
- **Tasks**: Task management with categories and completion tracking
- **Links**: Link management with PDF viewer integration
- **Morph Chart**: Collaborative design chart editing

### ✅ User Experience
- **Edit Mode**: Toggle edit mode to show/hide delete buttons
- **Collapsible Forms**: Clean UI with collapsible add forms
- **Real-time Updates**: Changes are immediately visible
- **Data Persistence**: All data is saved to localStorage

## 📋 Adding Your PDFs

### Step 1: Prepare Your PDFs
1. **Your PDF files are already ready!** You have:
   - `Concept Generation Guide.pdf` (Course Materials)
   - `Capacitors and Motors.pdf` (Technical Resources)
   - `Project Brief.pdf` (Project Documents)

### Step 2: Upload to GitHub
1. **Create the `pdfs` folder** in your repository
2. **Upload all PDF files** to the `pdfs` folder
3. **Commit and push** the changes

### Step 3: Test PDF Access
1. **Visit your website**
2. **Go to Links & Resources**
3. **Click "View PDF"** on any PDF link
4. **Verify PDFs open** in the browser viewer

## 🔧 Troubleshooting

### If PDFs Don't Load
1. **Check file paths**: Ensure PDFs are in the `pdfs/` folder
2. **Check file names**: Ensure they match the expected names
3. **Check browser console**: Look for 404 errors
4. **Verify GitHub Pages**: Ensure the repository is properly deployed

### If Data Doesn't Persist
1. **Check localStorage**: Open browser dev tools → Application → Local Storage
2. **Clear data**: Use the trash icon in the header to clear all data
3. **Refresh page**: Data should persist across page refreshes

### If GitHub Pages Doesn't Work
1. **Ensure repository is public**
2. **Check if files are in the root directory**
3. **Wait a few minutes for deployment**
4. **Check repository settings for Pages configuration**

## 📱 Mobile Support
- Fully responsive design
- Touch-friendly interface
- Works on all modern browsers
- Optimized for mobile devices

## 🎨 Customization
- **Modify `styles.css`** for visual changes
- **Update `script.js`** for functionality changes
- **Edit `index.html`** for content changes
- **Add PDFs to `pdfs/` folder** for new documents

## 🔒 Security Notes
- **No external dependencies**: Everything runs locally
- **Data privacy**: All data stays in user's browser
- **No server required**: Pure client-side application
- **GitHub hosting**: Reliable and free hosting

---

**Ready to deploy?** Follow the steps above and your Solar Truck Project will be live on the web with reliable PDF access and data persistence!
