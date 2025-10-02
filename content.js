// ========================================
// KESANA - Extends Asana features
// ========================================

// ========================================
// SHARED UTILITIES
// ========================================

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 4000) {
    // Remove existing toasts
    const existingToast = document.getElementById('kesana-toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast container
    const toast = document.createElement('div');
    toast.id = 'kesana-toast';

    // Set colors based on type
    let backgroundColor, icon;
    switch(type) {
        case 'success':
            backgroundColor = '#10B981';
            icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
            break;
        case 'error':
            backgroundColor = '#EF4444';
            icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
            break;
        case 'warning':
            backgroundColor = '#F59E0B';
            icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
            break;
        default:
            backgroundColor = '#3B82F6';
            icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: ${backgroundColor};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10001;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        max-width: 500px;
        animation: slideIn 0.3s ease;
        font-size: 14px;
        font-weight: 500;
    `;

    toast.innerHTML = `
        <style>
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        </style>
        <div style="flex-shrink: 0;">${icon}</div>
        <div style="flex: 1;">${message}</div>
        <button id="kesana-toast-close" style="background: none; border: none; color: white; cursor: pointer; padding: 0; margin: 0; flex-shrink: 0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;

    document.body.appendChild(toast);

    // Close button handler
    document.getElementById('kesana-toast-close').addEventListener('click', () => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    });

    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }
}

/**
 * Show progress modal for task uploads
 */
function showProgressModal(totalTasks) {
    // Remove existing modal
    const existingModal = document.getElementById('kesana-progress-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'kesana-progress-modal';
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
        z-index: 10002;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 32px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    `;

    modalContent.innerHTML = `
        <div style="text-align: center;">
            <h2 style="margin: 0 0 24px 0; font-size: 20px; color: #333; font-weight: 600;">Creating Tasks</h2>

            <div style="margin-bottom: 16px;">
                <div style="background: #f3f4f6; border-radius: 999px; height: 12px; overflow: hidden; position: relative;">
                    <div id="kesana-progress-bar" style="background: linear-gradient(90deg, #FF584A, #FF7A6E); height: 100%; width: 0%; transition: width 0.3s ease; border-radius: 999px;"></div>
                </div>
            </div>

            <div id="kesana-progress-text" style="font-size: 14px; color: #666; margin-bottom: 8px;">
                Preparing... (0 of ${totalTasks})
            </div>

            <div id="kesana-progress-details" style="font-size: 12px; color: #999; min-height: 20px;">
            </div>

            <div id="kesana-progress-errors" style="margin-top: 16px; max-height: 150px; overflow-y: auto; text-align: left; display: none;">
            </div>
        </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    return {
        update: (current, taskName, hasError = false) => {
            const progressBar = document.getElementById('kesana-progress-bar');
            const progressText = document.getElementById('kesana-progress-text');
            const progressDetails = document.getElementById('kesana-progress-details');

            if (progressBar && progressText) {
                const percentage = (current / totalTasks) * 100;
                progressBar.style.width = percentage + '%';
                progressText.textContent = `${current} of ${totalTasks} tasks ${current === totalTasks ? 'completed' : 'created'}`;

                if (taskName && current < totalTasks) {
                    progressDetails.textContent = `Creating: ${taskName}`;
                } else {
                    progressDetails.textContent = '';
                }
            }
        },
        addError: (taskName, error) => {
            const errorsContainer = document.getElementById('kesana-progress-errors');
            if (errorsContainer) {
                errorsContainer.style.display = 'block';
                const errorItem = document.createElement('div');
                errorItem.style.cssText = `
                    background: #FEE2E2;
                    border-left: 3px solid #EF4444;
                    padding: 8px 12px;
                    margin-bottom: 8px;
                    border-radius: 4px;
                    font-size: 12px;
                `;
                errorItem.innerHTML = `<strong>${taskName}</strong>: ${error}`;
                errorsContainer.appendChild(errorItem);
            }
        },
        close: () => {
            setTimeout(() => {
                modalOverlay.remove();
            }, 1000);
        }
    };
}

async function createExcelTemplate(){
    // Create workbook and worksheet using ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tasks');

    // Define template columns for Asana task creation
    const headers = [
        'Task Name*',
        'Images',
        'Description',
        'Assignee Email',
        'Due Date (YYYY-MM-DD)',
        'Tags (comma separated)',
        'Notes'
    ];

    // Create instruction row
    const instructions = [
        'Enter task name (required)',
        'Paste image or enter URL',
        'Detailed description of the task',
        'Email of the assignee',
        'Format: 2025-12-31',
        'tag1, tag2, tag3',
        'Any additional notes'
    ];

    // Create sample rows
    const sampleData = [
        [
            'Design homepage mockup',
            'https://via.placeholder.com/800x600.png/FF584A/FFFFFF?text=Homepage+Mockup',
            'Create high-fidelity mockups for the new homepage design',
            'designer@example.com',
            '2025-12-15',
            'design, homepage',
            'Use brand colors from style guide'
        ],
        [
            'Implement user authentication',
            'You can paste screenshots here',
            'Add login and signup functionality with OAuth',
            'developer@example.com',
            '2025-12-20',
            'backend, security',
            'Use JWT for session management'
        ],
        [
            'Review Q4 budget',
            'https://via.placeholder.com/600x400.png/4CAF50/FFFFFF?text=Budget+Chart',
            'Analyze and approve Q4 marketing budget',
            'manager@example.com',
            '2025-12-10',
            'finance, review',
            'Focus on ROI metrics'
        ]
    ];

    // Add headers
    worksheet.addRow(headers);

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF584A' }
    };

    // Add instruction row
    worksheet.addRow(instructions);

    // Add sample data
    sampleData.forEach(row => {
        worksheet.addRow(row);
    });

    // Set column widths
    worksheet.columns = [
        { width: 35 },  // Task Name
        { width: 50 },  // Images
        { width: 50 },  // Description
        { width: 30 },  // Assignee Email
        { width: 25 },  // Due Date
        { width: 25 },  // Tags
        { width: 40 }   // Notes
    ];

    // Generate Excel file and download
    const fileName = `Asana_Tasks_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();

    // Create download link
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Extract embedded images from Excel using ExcelJS
 */
async function extractImagesFromExcel(arrayBuffer) {
    const images = [];

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        const worksheet = workbook.worksheets[0];

        // Extract images from worksheet
        worksheet.getImages().forEach(image => {
            const img = workbook.model.media[image.imageId];
            if (img) {
                // Get image position (row and column)
                const { tl } = image.range; // top-left position

                images.push({
                    row: tl.nativeRow,
                    col: tl.nativeCol,
                    data: `data:${img.type};base64,${img.buffer.toString('base64')}`,
                    extension: img.extension
                });
            }
        });
    } catch (error) {
        console.error('Error extracting images:', error);
    }

    return images;
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

    // Check if user is logged in to Asana
    chrome.runtime.sendMessage({ action: 'checkAuth' }, (response) => {
        if (response.success && response.isAuthenticated) {
            // User is logged in, fetch projects
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
                    showToast('Error loading projects: ' + projectsResponse.error, 'error');
                }
            });
        } else {
            // User not logged in to Asana
            projectSelect.innerHTML = '<option value="">Please log in to Asana first</option>';

            // Add message
            const message = document.createElement('p');
            message.textContent = 'You need to be logged in to Asana to use this feature.';
            message.style.cssText = 'margin-top: 8px; font-size: 14px; color: #666;';
            projectSelect.parentElement.appendChild(message);

            // Add link to Asana
            const loginLink = document.createElement('a');
            loginLink.textContent = 'Open Asana in new tab';
            loginLink.href = 'https://app.asana.com';
            loginLink.target = '_blank';
            loginLink.style.cssText = 'display: inline-block; margin-top: 8px; color: #FF584A; font-weight: 600; text-decoration: none;';
            projectSelect.parentElement.appendChild(loginLink);
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
            showToast('Please select an Excel file', 'warning');
            return;
        }

        if (!selectedProject) {
            showToast('Please select a project', 'warning');
            return;
        }

        // Read and process Excel file
        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = async function(e) {
            try {
                const arrayBuffer = e.target.result;

                // Use ExcelJS to read the workbook
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(arrayBuffer);

                const worksheet = workbook.worksheets[0];

                // Convert worksheet to array format (similar to XLSX.utils.sheet_to_json)
                const jsonData = [];
                worksheet.eachRow((row, rowNumber) => {
                    const rowData = [];
                    row.eachCell({ includeEmpty: true }, (cell) => {
                        rowData.push(cell.value);
                    });
                    jsonData.push(rowData);
                });

                // Extract embedded images using ExcelJS
                const embeddedImages = await extractImagesFromExcel(arrayBuffer);

                // Parse tasks (skip header and instruction rows)
                const tasks = [];
                console.log('Total rows in Excel:', jsonData.length);

                for (let i = 2; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    console.log(`Row ${i}:`, row);

                    // Skip empty rows
                    if (!row[0]) {
                        console.log(`Skipping row ${i} - empty task name`);
                        continue;
                    }

                    // Get images for this row (column B, which is index 1)
                    const rowImages = embeddedImages.filter(img => img.row === i && img.col === 1);

                    // Combine URL-based images and embedded images
                    const imageUrls = row[1] && typeof row[1] === 'string' ? row[1].split(',').map(url => url.trim()).filter(url => url) : [];
                    const embeddedImageData = rowImages.map(img => img.data);

                    const task = {
                        name: row[0],
                        imageUrls: imageUrls, // URL-based images
                        imageData: embeddedImageData, // Base64 embedded images
                        description: row[2] || '',
                        assignee: row[3] || null,
                        dueDate: row[4] || null,
                        tags: row[5] && typeof row[5] === 'string' ? row[5].split(',').map(t => t.trim()) : [],
                        notes: row[6] || ''
                    };

                    console.log('Parsed task:', task);
                    tasks.push(task);
                }

                console.log('Total tasks parsed:', tasks.length);

                if (tasks.length === 0) {
                    showToast('No tasks found in the Excel file', 'warning');
                    return;
                }

                // Close the modal and show progress
                modalOverlay.remove();

                // Show progress modal
                const progressModal = showProgressModal(tasks.length);

                // Create tasks one by one with progress updates
                (async () => {
                    const results = [];
                    let successCount = 0;
                    let failedCount = 0;

                    for (let i = 0; i < tasks.length; i++) {
                        const task = tasks[i];

                        // Update progress
                        progressModal.update(i, task.name);

                        try {
                            // Create task via background script
                            const result = await new Promise((resolve) => {
                                chrome.runtime.sendMessage({
                                    action: 'createTask',
                                    projectGid: selectedProject,
                                    taskData: task
                                }, resolve);
                            });

                            results.push(result);

                            if (result.success) {
                                successCount++;
                            } else {
                                failedCount++;
                                progressModal.addError(task.name, result.error || 'Unknown error');
                            }
                        } catch (error) {
                            failedCount++;
                            progressModal.addError(task.name, error.message);
                            results.push({ success: false, error: error.message, taskName: task.name });
                        }

                        // Update final count
                        progressModal.update(i + 1, null);

                        // Small delay to avoid rate limiting
                        if (i < tasks.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }

                    // Show completion message
                    if (failedCount === 0) {
                        showToast(`Successfully created ${successCount} task${successCount > 1 ? 's' : ''}!`, 'success', 5000);
                    } else if (successCount > 0) {
                        showToast(`Created ${successCount} task${successCount > 1 ? 's' : ''}. ${failedCount} failed (see details above).`, 'warning', 0);
                    } else {
                        showToast(`All ${failedCount} task${failedCount > 1 ? 's' : ''} failed to create.`, 'error', 0);
                    }

                    // Close progress modal
                    progressModal.close();
                })();

            } catch (error) {
                console.error('Error processing Excel file:', error);
                showToast('Error reading Excel file: ' + error.message, 'error');
            }
        };

        reader.readAsArrayBuffer(file);
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

  // Setup Download Excel Action
  downloadExcelBtn.addEventListener("click", async function () {
    console.log("Download Excel clicked");
    try {
      await createExcelTemplate();
      showToast('Excel template downloaded successfully!', 'success');
    } catch (error) {
      console.error("Error creating Excel template:", error);
      showToast('Error creating Excel template: ' + error.message, 'error');
    }
    mainActionBtn.classList.remove("active");
    actionMenu.classList.remove("show");
  });

  // Setup Upload Excel Action
  uploadExcelBtn.addEventListener("click", function () {
    console.log("Upload Excel clicked");
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
