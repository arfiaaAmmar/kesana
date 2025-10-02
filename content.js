// ========================================
// KESANA - Extends Asana features
// ========================================

// ========================================
// SHARED UTILITIES
// ========================================

function createExcelTemplate(){
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Define template columns for Asana task creation
    const headers = [
        'Task Name',
        'Description',
        'Assignee',
        'Due Date',
        'Priority',
        'Status',
        'Section',
        'Tags',
        'Parent Task',
        'Notes'
    ];

    // Create sample rows with helpful placeholders
    const sampleData = [
        [
            'Example Task 1',
            'Task description goes here',
            'user@example.com',
            '2025-12-31',
            'High',
            'Not Started',
            'To Do',
            'tag1, tag2',
            '',
            'Additional notes'
        ],
        [
            'Example Task 2',
            'Another task description',
            'user@example.com',
            '2025-12-31',
            'Medium',
            'In Progress',
            'In Progress',
            'tag3',
            'Example Task 1',
            ''
        ]
    ];

    // Combine headers and sample data
    const wsData = [headers, ...sampleData];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
        { wch: 30 },  // Task Name
        { wch: 40 },  // Description
        { wch: 25 },  // Assignee
        { wch: 12 },  // Due Date
        { wch: 10 },  // Priority
        { wch: 15 },  // Status
        { wch: 15 },  // Section
        { wch: 20 },  // Tags
        { wch: 25 },  // Parent Task
        { wch: 30 }   // Notes
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Asana Tasks');

    // Generate Excel file and download
    XLSX.writeFile(wb, 'Asana_Task_Template.xlsx');
}

/**
 * Creates and shows the upload Excel modal for project selection
 */
function uploadExcelModal() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'upload-excel-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 24px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    `;

    modalContent.innerHTML = `
        <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #333;">Upload Excel to Asana</h2>

        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">Select Project:</label>
            <select id="project-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                <option value="">Loading projects...</option>
            </select>
        </div>

        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">Select Excel File:</label>
            <input type="file" id="excel-file-input" accept=".xlsx, .xls" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>

        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
            <button id="cancel-upload-btn" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: white; color: black; cursor: pointer; font-size: 14px;">Cancel</button>
            <button id="upload-confirm-btn" style="padding: 8px 16px; border: none; border-radius: 4px; background: #FF584A; color: white; cursor: pointer; font-size: 14px;">Upload & Create Tasks</button>
        </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Fetch and populate projects from Asana API
    const projectSelect = document.getElementById('project-select');

    // Check if user is authenticated and fetch projects
    chrome.runtime.sendMessage({ action: 'getAccessToken' }, (response) => {
        if (response.success && response.token) {
            // User is authenticated, fetch projects
            chrome.runtime.sendMessage({ action: 'fetchProjects' }, (projectsResponse) => {
                if (projectsResponse.success) {
                    projectSelect.innerHTML = '<option value="">Select a project...</option>';
                    projectsResponse.projects.forEach(project => {
                        const option = document.createElement('option');
                        option.value = project.gid;
                        option.textContent = project.name;
                        projectSelect.appendChild(option);
                    });
                } else {
                    projectSelect.innerHTML = '<option value="">Error loading projects</option>';
                    console.error('Error fetching projects:', projectsResponse.error);
                }
            });
        } else {
            // User not authenticated, show sign-in option
            projectSelect.innerHTML = '<option value="">Please sign in to Asana first</option>';

            // Add sign-in button
            const signInBtn = document.createElement('button');
            signInBtn.textContent = 'Sign in to Asana';
            signInBtn.style.cssText = 'width: 100%; padding: 8px; margin-top: 8px; background: #FF584A; color: white; border: none; border-radius: 4px; cursor: pointer;';
            projectSelect.parentElement.appendChild(signInBtn);

            signInBtn.addEventListener('click', () => {
                chrome.runtime.sendMessage({ action: 'authenticate' }, (authResponse) => {
                    if (authResponse.success) {
                        // Reload projects after authentication
                        signInBtn.remove();
                        projectSelect.innerHTML = '<option value="">Loading projects...</option>';
                        chrome.runtime.sendMessage({ action: 'fetchProjects' }, (projectsResponse) => {
                            if (projectsResponse.success) {
                                projectSelect.innerHTML = '<option value="">Select a project...</option>';
                                projectsResponse.projects.forEach(project => {
                                    const option = document.createElement('option');
                                    option.value = project.gid;
                                    option.textContent = project.name;
                                    projectSelect.appendChild(option);
                                });
                            }
                        });
                    } else {
                        alert('Authentication failed: ' + authResponse.error);
                    }
                });
            });
        }
    });

    // Cancel button handler
    document.getElementById('cancel-upload-btn').addEventListener('click', () => {
        modalOverlay.remove();
    });

    // Upload button handler
    document.getElementById('upload-confirm-btn').addEventListener('click', () => {
        const fileInput = document.getElementById('excel-file-input');
        const selectedProject = projectSelect.value;

        if (!fileInput.files[0]) {
            alert('Please select an Excel file');
            return;
        }

        if (!selectedProject) {
            alert('Please select a project');
            return;
        }

        // TODO: Process Excel file and create tasks in selected project
        console.log('Selected project:', selectedProject);
        console.log('Selected file:', fileInput.files[0]);

        modalOverlay.remove();
    });

    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    });
}

/**
 * Extracts git branch name from current Asana task
 * @returns {string} Formatted git branch name
 */
function getGitBranchName() {
  const taskURL = window.location.href;
  const urlParts = taskURL.split("/");
  const taskIndex = urlParts.indexOf("task");
  const taskId =
    taskIndex !== -1 ? urlParts[taskIndex + 1].split("?")[0] : null;

  // Try multiple selectors to find the task name
  let taskName = "";

  // Try the textarea first
  const textarea = document.querySelector('textarea[aria-label="Task Name"]');
  if (textarea) {
    taskName = textarea.value;
  }

  // If not found, try other selectors
  if (!taskName) {
    const h1 = document.querySelector('h1[contenteditable="true"]');
    if (h1) {
      taskName = h1.textContent;
    }
  }

  // Try another common selector
  if (!taskName) {
    const taskNameDiv = document.querySelector(".TaskName-input");
    if (taskNameDiv) {
      taskName = taskNameDiv.textContent || taskNameDiv.value;
    }
  }

  console.log("Task Name found:", taskName);

  const formattedTaskName = taskName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${taskId}-${formattedTaskName}`;
}

/**
 * Copies text to clipboard and shows feedback
 * @param {string} text - Text to copy
 * @param {Function} successCallback - Callback for success feedback
 */
function copyToClipboard(text, successCallback) {
  navigator.clipboard.writeText(text).then(() => {
    console.log("Git branch name copied to clipboard:", text);
    if (successCallback) successCallback();
  });
}

// ========================================
// TOOLBAR BUTTON FUNCTIONALITY
// ========================================

const copyGitBranchNameIcon = `
    <span class="AddAttachmentsButton TaskPaneToolbar-button TaskPaneToolbar-addAttachmentsButton">
        <input 
            id="add_attachments_button_file_input_0" 
            class="AddAttachmentsButton-hiddenFileInput" 
            multiple="" tabindex="-1" type="file"
        >
        <div 
            role="button" aria-expanded="false" aria-haspopup="menu" 
            aria-label="Copy git branch name"
            aria-disabled="false" tabindex="0"
            class="IconButtonThemeablePresentation--isEnabled 
                    IconButtonThemeablePresentation IconButtonThemeablePresentation--medium 
                    SubtleIconButton--standardTheme SubtleIconButton 
                    TaskPaneToolbar-attachmentsButton HighlightSol HighlightSol--core 
                    HighlightSol--buildingBlock Stack Stack--align-center 
                    Stack--direction-row Stack--display-inline Stack--justify-center"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="4" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="20" r="2"/>
                <line x1="12" y1="6" x2="12" y2="10"/>
                <line x1="12" y1="14" x2="12" y2="18"/>
                <line x1="12" y1="12" x2="18" y2="12"/>
                <circle cx="20" cy="12" r="2"/>
            </svg>
        </div>
        <noscript data-testid="noscript-container"></noscript>
        <noscript data-testid="noscript-container"></noscript>
    </span>
`;

/**
 * Creates and initializes the toolbar copy button
 */
function initToolbarButton() {
  const addAttachmentsBtn = document.querySelector(".AddAttachmentsButton");

  if (!addAttachmentsBtn) {
    // If button not found, retry after a delay
    setTimeout(initToolbarButton, 1000);
    return;
  }

  // Check if button already exists
  if (document.getElementById("copy-git-branch-name-btn")) return;

  // Create the button
  const copyBtn = document.createElement("button");
  copyBtn.id = "copy-git-branch-name-btn";
  copyBtn.innerHTML = copyGitBranchNameIcon;

  Object.assign(copyBtn.style, {
    cursor: "pointer",
    padding: "6px",
    border: "none",
    background: "transparent",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    title: "Copy Git Branch Name",
  });

  // Append on the left of the "AddAttachmentsButton"
  addAttachmentsBtn.parentNode.insertBefore(copyBtn, addAttachmentsBtn);

  // Update tooltip on hover
  copyBtn.addEventListener("mouseenter", function () {
    const branchName = getGitBranchName();
    copyBtn.title = `Copy Git Branch Name: ${branchName}`;
  });

  // Add click event listener
  copyBtn.addEventListener("click", function () {
    const gitBranchName = getGitBranchName();

    copyToClipboard(gitBranchName, () => {
      // Show success feedback
      copyBtn.innerHTML = `
        <svg 
            width="20" height="20" 
            viewBox="0 0 24 24" fill="none" 
            stroke="green" stroke-width="2"
        >
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `;
      setTimeout(() => {
        copyBtn.innerHTML = copyGitBranchNameIcon;
      }, 2000);
    });
  });
}

// ========================================
// FLOATING ACTION BUTTON FUNCTIONALITY
// ========================================

/**
 * Returns HTML structure for the floating action button
 */
function getFloatingActionButtonHTML() {
  return `
        <style>
        /* Main Container */
        .floating-action-container {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 1000;
        }
        
        /* Main Action Button */
        .main-action-btn {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #FF584A;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .main-action-btn:hover {
            background: #E54A3C;
            transform: scale(1.1);
        }
        
        /* Plus Icon */
         .plus-icon {
             color: white;
             font-size: 32px;
             font-weight: bold;
             line-height: 1;
             display: flex;
             align-items: center;
             justify-content: center;
             width: 100%;
             height: 100%;
             transition: transform 0.3s ease;
         }
        
        .main-action-btn.active .plus-icon {
            transform: rotate(45deg);
        }
        
        /* Action Menu */
        .action-menu {
            position: absolute;
            bottom: 70px;
            right: 0;
            opacity: 0;
            visibility: hidden;
            transform: translateY(20px);
            transition: all 0.3s ease;
        }
        
        .action-menu.show {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }
        
        /* Action Items */
         .action-item {
             background: white;
             border-radius: 25px;
             padding: 12px 20px;
             margin-bottom: 10px;
             box-shadow: 0 2px 8px rgba(0,0,0,0.2);
             cursor: pointer;
             display: flex;
             align-items: center;
             justify-content: flex-end;
             gap: 10px;
             min-width: 160px;
             transition: all 0.3s ease;
         }
        
        .action-item:hover {
            background: #f5f5f5;
            transform: translateX(-5px);
        }
        
        .action-icon {
            font-size: 18px;
        }
        
        .action-text {
            font-size: 14px;
            font-weight: 500;
            color: #333;
        }
    </style>
      <div class="floating-action-container">
          <div class="action-menu" id="actionMenu">
                <div class="action-item" id="downloadExcel">
                  <span class="action-text">Download Excel</span>
                  <span class="action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                          <path d="M12 15l-3-3h2V9h2v3h2l-3 3z"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10,9 9,9 8,9"/>
                      </svg>
                  </span>
              </div>
              <div class="action-item" id="uploadExcel">
                  <span class="action-text">Upload Excel</span>
                  <span class="action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10,9 9,9 8,9"/>
                      </svg>
                  </span>
              </div>
              <div class="action-item" id="copyGitBranch">
                  <span class="action-text">Copy Git Branch</span>
                  <span class="action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2">
                          <circle cx="12" cy="4" r="2"/>
                          <circle cx="12" cy="12" r="2"/>
                          <circle cx="12" cy="20" r="2"/>
                          <line x1="12" y1="6" x2="12" y2="10"/>
                          <line x1="12" y1="14" x2="12" y2="18"/>
                          <line x1="12" y1="12" x2="18" y2="12"/>
                          <circle cx="20" cy="12" r="2"/>
                      </svg>
                  </span>
              </div>
          </div>
          <button class="main-action-btn" id="mainActionBtn">
              <span class="plus-icon">+</span>
          </button>
      </div>
  `;
}

/**
 * Creates and initializes the floating action button
 */
function createFloatingActionButton() {
  // Check if floating action button already exists
  if (document.getElementById("floating-action-container")) {
    return;
  }

  // Create main container
  const floatingActionBtn = document.createElement("div");
  floatingActionBtn.id = "floating-action-container";
  floatingActionBtn.innerHTML = getFloatingActionButtonHTML();

  // Add to page
  document.body.appendChild(floatingActionBtn);

  // Get element references
  const mainActionBtn = document.getElementById("mainActionBtn");
  const actionMenu = document.getElementById("actionMenu");
  const downloadExcelBtn = document.getElementById("downloadExcel");
  const uploadExcelBtn = document.getElementById("uploadExcel");
  const copyGitBranchBtn = document.getElementById("copyGitBranch");

  // Setup event handlers
  // Setup menu toggle
  mainActionBtn.addEventListener("click", function () {
    const isActive = mainActionBtn.classList.contains("active");

    if (isActive) {
      mainActionBtn.classList.remove("active");
      actionMenu.classList.remove("show");
    } else {
      mainActionBtn.classList.add("active");
      actionMenu.classList.add("show");
    }
  });

  // Setup Click Outside
  document.addEventListener("click", function (event) {
    if (!floatingActionBtn.contains(event.target)) {
      mainActionBtn.classList.remove("active");
      actionMenu.classList.remove("show");
    }
  });

  // Setup Upload Excel Action
  uploadExcelBtn.addEventListener("click", function () {
    console.log("Upload Excel clicked");
    // TODO: Add your upload excel functionality here
    uploadExcelModal();
    mainActionBtn.classList.remove("active");
    actionMenu.classList.remove("show");
  });

  // Setup Copy Git Branch Action
  copyGitBranchBtn.addEventListener("click", function () {
    const gitBranchName = getGitBranchName();

    copyToClipboard(gitBranchName, () => {
      // Show success feedback
      const originalIcon = copyGitBranchBtn.querySelector(".action-icon");
      const originalText = copyGitBranchBtn.querySelector(".action-text");
      originalIcon.innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
      originalText.textContent = "Copied!";

      setTimeout(() => {
        originalIcon.innerHTML = `
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2">
                  <circle cx="12" cy="4" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="12" cy="20" r="2"/>
                  <line x1="12" y1="6" x2="12" y2="10"/>
                  <line x1="12" y1="14" x2="12" y2="18"/>
                  <line x1="12" y1="12" x2="18" y2="12"/>
                  <circle cx="20" cy="12" r="2"/>
              </svg>
          `;
        originalText.textContent = "Copy Git Branch";
      }, 2000);
    });

    mainActionBtn.classList.remove("active");
    actionMenu.classList.remove("show");
  });
}

// ========================================
// INITIALIZATION
// ========================================

/**
 * Initialize all extension functionality
 */
function initExtension() {
  initToolbarButton();
  createFloatingActionButton();
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initExtension);
} else {
  initExtension();
}
