# Kesana

**Kesana** is a Chrome extension that extends Asana with powerful productivity features for developers and teams.

## Features

### 🚀 Bulk Task Creation from Excel
- **Download Excel Template**: Get a pre-formatted Excel template with sample data
- **Upload Excel File**: Create multiple Asana tasks at once from an Excel file
- **Image Support**: Paste screenshots directly into Excel cells or use image URLs
- **Task Assignment**: Automatically assign tasks to team members using their email addresses
- **Rich Task Data**: Include descriptions, due dates, tags, and notes for each task

### 🔀 Git Branch Name Generator
- **One-Click Copy**: Automatically generate git branch names from Asana task IDs and names
- **Formatted Output**: Creates clean, lowercase, hyphenated branch names like `123456-implement-user-authentication`
- **Toolbar Integration**: Quick access button directly in Asana's task toolbar

### 📋 Floating Action Menu
- Beautiful floating action button in the bottom-right corner of Asana pages
- Quick access to all Kesana features:
  - Download Excel template
  - Upload Excel file
  - Copy git branch name

## Installation

### Chrome
1. Clone this repository or download as a zip file:
   ```bash
   git clone https://github.com/yourusername/kesana.git
   ```
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `kesana` folder
5. The extension icon should appear in your toolbar

### Usage
1. Navigate to any Asana task page at `https://app.asana.com`
2. You'll see a floating action button (orange circle with +) in the bottom-right corner
3. Click it to access all features
4. The git branch copy button also appears in the task toolbar

**Note**: You must be logged in to Asana for all features to work properly. The extension uses your existing Asana session for authentication.

## Excel Template Format

The Excel template includes the following columns:

| Column | Description | Required |
|--------|-------------|----------|
| Task Name | Name of the task | Yes |
| Images | Paste screenshots or enter image URLs (comma-separated) | No |
| Description | Detailed description of the task | No |
| Assignee Email | Email address of the person to assign the task to | No |
| Due Date | Due date in YYYY-MM-DD format | No |
| Tags | Comma-separated tags | No |
| Notes | Additional notes for the task | No |

## Privacy Policy and Permissions

**We respect your privacy:**
- No data collection or external servers
- All data stays between you and Asana's API
- All API calls use HTTPS directly to Asana
- Settings saved locally in your browser only

**Required Permissions:**
- `https://app.asana.com/*` - To function on Asana web app
- `cookies` - To authenticate with your existing Asana session
- `storage` - To save extension settings locally

## Technical Details

- Built with vanilla JavaScript (no frameworks)
- Uses ExcelJS library for Excel file processing
- Authenticates using Asana session cookies
- Direct API calls to Asana API v1.0
- Supports image attachments up to 100MB

## Feedback & Contribution

Found a bug or have a feature request? Please open an issue on [GitHub Issues](https://github.com/yourusername/kesana/issues).

Pull requests are welcome! Feel free to contribute to make Kesana even better.

## License

MIT License - feel free to use and modify for your own projects.

## Disclaimer

This extension is provided as-is. Use at your own risk. The author is not responsible for any data loss or issues caused by using this extension. Always verify your tasks before bulk uploading.