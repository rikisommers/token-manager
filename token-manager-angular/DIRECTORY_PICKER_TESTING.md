# GitHub Directory Picker Testing Guide

## New Feature Added

The Angular implementation now includes a **GitHub Directory Picker** component that matches the Next.js functionality.

## How It Works

1. **Test Connection**: First, enter your GitHub credentials and test the connection
2. **Import from GitHub**: Click the "Import from GitHub" button
3. **Directory Picker Opens**: A modal dialog appears showing your repository's directory structure
4. **Select File or Directory**:
   - Click on a JSON file to import a single file
   - Click on a directory to import all JSON files from that directory
5. **Import**: Click the "Import" button to load the tokens

## Features

- **Hierarchical Directory Navigation**: Browse through repository folders
- **Branch Selection**: Switch between different branches
- **File/Directory Selection**: Import individual files or entire directories
- **Visual Feedback**: Selected items are highlighted
- **Error Handling**: Clear error messages for connection or import issues

## Testing Steps

To test the directory picker:

1. Start the dev server: `npm start`
2. Navigate to http://localhost:4200
3. Fill in GitHub credentials:
   - GitHub Token: Your personal access token
   - Repository: owner/repo format
   - Branch: main (or your default branch)
4. Click "Test Connection"
5. Once connected, click "Import from GitHub"
6. The directory picker dialog will appear
7. Navigate through folders and select a file or directory
8. Click "Import" to load the tokens

## Component Location

- **Component**: `src/app/components/github-directory-picker.component.ts`
- **Integration**: `src/app/components/token-generator.component.ts`

## Differences from Next.js

The Angular implementation provides the same functionality as the Next.js version:
- Same UI/UX
- Same directory navigation
- Same file/directory selection
- Same branch switching
- Uses the same GitHub API endpoints

