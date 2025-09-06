/* Admin Enhancements JavaScript */

(function ($) {
    'use strict';

    // Initialize admin enhancements when document is ready
    $(document).ready(function () {
        initAdminEnhancements();
    });

    function initAdminEnhancements() {
        // Enhance form validation
        enhanceFormValidation();

        // Add better UX for list actions
        enhanceListActions();

        // Improve search functionality
        enhanceSearch();

        // Add keyboard shortcuts
        addKeyboardShortcuts();

        // Enhance file uploads
        enhanceFileUploads();

        // Add confirmation dialogs
        addConfirmations();
    }

    function enhanceFormValidation() {
        // Add real-time validation feedback
        $('form').on('blur', 'input[required], textarea[required], select[required]', function () {
            validateField($(this));
        });

        // Validate on form submit
        $('form').on('submit', function (e) {
            var isValid = true;
            $(this).find('input[required], textarea[required], select[required]').each(function () {
                if (!validateField($(this))) {
                    isValid = false;
                }
            });

            if (!isValid) {
                e.preventDefault();
                showMessage('Please fix the errors above before submitting.', 'error');
            }
        });
    }

    function validateField($field) {
        var value = $field.val();
        var isValid = value && value.trim() !== '';

        // Remove existing validation classes
        $field.removeClass('valid invalid');

        if (isValid) {
            $field.addClass('valid');
            $field.next('.field-error').remove();
        } else {
            $field.addClass('invalid');
            if (!$field.next('.field-error').length) {
                $field.after('<div class="field-error">This field is required</div>');
            }
        }

        return isValid;
    }

    function enhanceListActions() {
        // Add select all functionality
        if ($('#action-toggle').length) {
            $('#action-toggle').on('change', function () {
                var checked = $(this).is(':checked');
                $('input[name="action"]').prop('checked', checked);
                updateActionButton();
            });
        }

        // Update action button state
        $('input[name="action"]').on('change', function () {
            updateActionButton();
        });

        function updateActionButton() {
            var checkedCount = $('input[name="action"]:checked').length;
            var $actionButton = $('button[name="index"]');

            if (checkedCount > 0) {
                $actionButton.prop('disabled', false).text('Execute action on ' + checkedCount + ' items');
            } else {
                $actionButton.prop('disabled', true).text('Execute action');
            }
        }
    }

    function enhanceSearch() {
        // Add search suggestions (basic implementation)
        var $searchInput = $('input[name="q"]');
        if ($searchInput.length) {
            $searchInput.on('input', function () {
                var query = $(this).val();
                if (query.length > 2) {
                    // Could implement AJAX search suggestions here
                    console.log('Searching for:', query);
                }
            });
        }
    }

    function addKeyboardShortcuts() {
        // Add keyboard shortcuts for common actions
        $(document).on('keydown', function (e) {
            // Ctrl+S to save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                $('input[name="_save"]').click();
            }

            // Ctrl+Enter to save and continue editing
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                $('input[name="_continue"]').click();
            }

            // Escape to cancel
            if (e.key === 'Escape') {
                if (confirm('Are you sure you want to cancel?')) {
                    window.history.back();
                }
            }
        });
    }

    function enhanceFileUploads() {
        // Add file upload progress indicators
        $('input[type="file"]').on('change', function () {
            var files = this.files;
            var $container = $(this).closest('.field-file');

            if (files.length > 0) {
                var fileList = '<div class="file-list">';
                for (var i = 0; i < files.length; i++) {
                    fileList += '<div class="file-item">' + files[i].name + ' (' + formatFileSize(files[i].size) + ')</div>';
                }
                fileList += '</div>';

                $container.find('.file-list').remove();
                $container.append(fileList);
            }
        });
    }

    function addConfirmations() {
        // Add confirmation for delete actions
        $('a[href*="delete/"]').on('click', function (e) {
            if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                e.preventDefault();
            }
        });

        // Add confirmation for bulk actions
        $('button[name="index"]').on('click', function (e) {
            var action = $('#id_action').val();
            if (action === 'delete_selected') {
                if (!confirm('Are you sure you want to delete the selected items? This action cannot be undone.')) {
                    e.preventDefault();
                }
            }
        });
    }

    function showMessage(message, type) {
        var $message = $('<div class="admin-message admin-' + type + '">' + message + '</div>');
        $('body').prepend($message);

        setTimeout(function () {
            $message.fadeOut(function () {
                $message.remove();
            });
        }, 5000);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        var k = 1024;
        var sizes = ['Bytes', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Utility functions
    window.AdminUtils = {
        showMessage: showMessage,
        formatFileSize: formatFileSize
    };

})(django.jQuery || jQuery);
