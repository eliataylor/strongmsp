"""
Screenshot Service for CoachContent

Generates light and dark mode screenshots of CoachContent using headless Chrome.
"""
import os
import io
import logging
from typing import Optional, Tuple
from django.core.files.base import ContentFile
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import markdown

logger = logging.getLogger(__name__)


class ScreenshotService:
    """
    Service for generating screenshots of CoachContent in light and dark themes.
    """
    
    def __init__(self, organization=None):
        self.driver = None
        self.organization = organization
    
    def generate_screenshots(self, coach_content, overwrite: bool = False) -> Tuple[bool, bool]:
        """
        Generate both light and dark screenshots for a CoachContent instance.
        
        Args:
            coach_content: CoachContent model instance
            overwrite: Whether to overwrite existing screenshots
            
        Returns:
            Tuple of (light_success, dark_success)
        """
        try:
            # Check if screenshots already exist
            if not overwrite and coach_content.screenshot_light and coach_content.screenshot_dark:
                logger.info(f"Screenshots already exist for CoachContent #{coach_content.id}, skipping")
                return True, True
            
            # Get organization from coach_content if not already set
            organization = self.organization
            if not organization and hasattr(coach_content, 'assignment') and coach_content.assignment:
                if hasattr(coach_content.assignment, 'payment') and coach_content.assignment.payment:
                    organization = coach_content.assignment.payment.organization
            
            # Convert markdown to HTML
            body_html = self.markdown_to_html(coach_content.body or "")
            
            # Generate light theme screenshot
            light_success = False
            if not coach_content.screenshot_light or overwrite:
                light_success = self._generate_theme_screenshot(
                    coach_content, body_html, 'light', organization
                )
            
            # Generate dark theme screenshot
            dark_success = False
            if not coach_content.screenshot_dark or overwrite:
                dark_success = self._generate_theme_screenshot(
                    coach_content, body_html, 'dark', organization
                )
            
            return light_success, dark_success
            
        except Exception as e:
            logger.error(f"Error generating screenshots for CoachContent #{coach_content.id}: {e}")
            return False, False
        finally:
            self._cleanup_driver()
    
    def markdown_to_html(self, markdown_text: str) -> str:
        """
        Convert markdown text to HTML.
        
        Args:
            markdown_text: Raw markdown string
            
        Returns:
            HTML string
        """
        if not markdown_text:
            return ""
        
        # Configure markdown with extensions for better rendering
        md = markdown.Markdown(extensions=[
            'markdown.extensions.extra',
            'markdown.extensions.codehilite',
            'markdown.extensions.toc',
            'markdown.extensions.tables'
        ])
        
        return md.convert(markdown_text)
    
    def _generate_theme_screenshot(self, coach_content, body_html: str, theme: str, organization=None) -> bool:
        """
        Generate screenshot for a specific theme.
        
        Args:
            coach_content: CoachContent model instance
            body_html: Rendered HTML content
            theme: 'light' or 'dark'
            organization: Organization instance for branding
            
        Returns:
            Boolean indicating success
        """
        try:
            # Render HTML template
            html_content = self.render_html_template(
                coach_content.title or "Untitled",
                body_html,
                theme,
                organization
            )
            
            # Capture screenshot
            png_bytes = self.capture_screenshot(html_content, theme)
            
            if png_bytes:
                # Save to model field
                return self.save_screenshot_to_field(coach_content, png_bytes, theme)
            
            return False
            
        except Exception as e:
            logger.error(f"Error generating {theme} screenshot for CoachContent #{coach_content.id}: {e}")
            return False
    
    def render_html_template(self, title: str, body_html: str, theme: str, organization=None) -> str:
        """
        Create standalone HTML page with embedded CSS.
        
        Args:
            title: Content title
            body_html: Rendered HTML content
            theme: 'light' or 'dark'
            organization: Organization instance for branding
            
        Returns:
            Complete HTML string
        """
        # Extract branding from organization if available
        primary_color = '#007bff'  # Default fallback
        secondary_color = '#6c757d'  # Default fallback
        font_family = 'Montserrat'  # Default fallback
        background_color = '#ffffff' if theme == 'light' else '#121212'  # Default fallback
        paper_color = '#fafafa' if theme == 'light' else '#1e1e1e'  # Default fallback
        
        if organization:
            # Extract colors from branding_palette
            if organization.branding_palette:
                palette = organization.branding_palette
                if theme in palette:
                    theme_palette = palette[theme]
                    if 'primary' in theme_palette and 'main' in theme_palette['primary']:
                        primary_color = theme_palette['primary']['main']
                    if 'secondary' in theme_palette and 'main' in theme_palette['secondary']:
                        secondary_color = theme_palette['secondary']['main']
                    if 'background' in theme_palette and 'default' in theme_palette['background']:
                        background_color = theme_palette['background']['default']
                    if 'paper' in theme_palette and 'main' in theme_palette['paper']:
                        paper_color = theme_palette['paper']['main']
            
            # Extract font family from branding_typography
            if organization.branding_typography and 'fontFamily' in organization.branding_typography:
                font_family = organization.branding_typography['fontFamily']
        
        # Define CSS variables based on theme and branding
        if theme == 'light':
            bg_color = background_color
            text_color = '#212121'
            text_secondary = '#666666'
            code_bg = paper_color
            blockquote_bg = paper_color
            blockquote_border = primary_color
        else:  # dark
            bg_color = background_color
            text_color = '#ffffff'
            text_secondary = '#b3b3b3'
            code_bg = paper_color
            blockquote_bg = paper_color
            blockquote_border = primary_color
        
        html_template = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: {font_family}, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: {text_color};
            background-color: {bg_color};
            padding: 20px;
            margin: 0;
            width: 100%;
            min-height: 100vh;
        }}
        
        .content-container {{
            background-color: {bg_color};
            padding: 30px;
            width: 100%;
            min-height: calc(100vh - 40px);
            box-sizing: border-box;
        }}
        
        h1 {{
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 2rem;
            color: {text_color};
            line-height: 1.2;
        }}
        
        .content-body {{
            font-size: 1.1rem;
            line-height: 1.7;
        }}
        
        .content-body p {{
            margin: 0 0 1.5rem 0;
        }}
        
        .content-body h1, .content-body h2, .content-body h3, 
        .content-body h4, .content-body h5, .content-body h6 {{
            margin-top: 2rem;
            margin-bottom: 1rem;
            font-weight: bold;
            color: {text_color};
        }}
        
        .content-body h2 {{
            font-size: 1.8rem;
        }}
        
        .content-body h3 {{
            font-size: 1.5rem;
        }}
        
        .content-body ul, .content-body ol {{
            margin: 1.5rem 0;
            padding-left: 2rem;
        }}
        
        .content-body li {{
            margin-bottom: 0.5rem;
        }}
        
        .content-body a {{
            color: {primary_color};
            text-decoration: none;
        }}
        
        .content-body a:hover {{
            text-decoration: underline;
        }}
        
        .content-body blockquote {{
            border-left: 4px solid {blockquote_border};
            padding-left: 1.5rem;
            margin: 1.5rem 0;
            font-style: italic;
            color: {text_secondary};
            background-color: {blockquote_bg};
            padding: 1.5rem;
            border-radius: 4px;
        }}
        
        .content-body code {{
            background-color: {code_bg};
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9em;
        }}
        
        .content-body pre {{
            background-color: {code_bg};
            padding: 1.5rem;
            border-radius: 4px;
            overflow-x: auto;
            margin: 1.5rem 0;
        }}
        
        .content-body pre code {{
            background: none;
            padding: 0;
        }}
        
        .content-body table {{
            width: 100%;
            border-collapse: collapse;
            margin: 1.5rem 0;
        }}
        
        .content-body th, .content-body td {{
            border: 1px solid {text_secondary};
            padding: 0.75rem;
            text-align: left;
        }}
        
        .content-body th {{
            background-color: {code_bg};
            font-weight: bold;
        }}
    </style>
</head>
<body>
    <div class="content-container">
        <h1>{title}</h1>
        <div class="content-body">
            {body_html}
        </div>
    </div>
</body>
</html>
"""
        return html_template
    
    def capture_screenshot(self, html_content: str, theme: str) -> Optional[bytes]:
        """
        Use Selenium + headless Chrome to capture screenshot.
        
        Args:
            html_content: Complete HTML string
            theme: Theme name for logging
            
        Returns:
            PNG bytes or None if failed
        """
        import tempfile
        import urllib.parse
        
        try:
            # Setup Chrome options for 8.5x11 (letter size)
            # 8.5 inches at 96 DPI = 816px, 11 inches = 1056px
            chrome_options = Options()
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=816,1056')
            chrome_options.add_argument('--disable-web-security')
            chrome_options.add_argument('--allow-running-insecure-content')
            chrome_options.add_argument('--force-device-scale-factor=1')
            chrome_options.add_argument('--disable-extensions')
            chrome_options.add_argument('--disable-plugins')
            
            # Initialize driver
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            
            # Set viewport size to match window size
            self.driver.set_window_size(816, 1056)
            
            # Create a temporary HTML file instead of using data URL
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as temp_file:
                temp_file.write(html_content)
                temp_file_path = temp_file.name
            
            try:
                # Load the HTML file
                file_url = f"file://{temp_file_path}"
                self.driver.get(file_url)
                
                # Wait for content to load
                self.driver.implicitly_wait(5)
                
                # Wait for the page to be fully loaded
                from selenium.webdriver.support.ui import WebDriverWait
                from selenium.webdriver.support import expected_conditions as EC
                from selenium.webdriver.common.by import By
                
                try:
                    # Wait for the content container to be present and visible
                    WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.CLASS_NAME, "content-container"))
                    )
                except Exception as e:
                    logger.warning(f"Timeout waiting for content container: {e}")
                
                # Scroll to top to ensure content is visible
                self.driver.execute_script("window.scrollTo(0, 0);")
                
                # Additional wait to ensure rendering is complete
                import time
                time.sleep(2)
                
                # Content is loaded and ready for screenshot
                
                # Take screenshot
                png_bytes = self.driver.get_screenshot_as_png()
                
                logger.info(f"Successfully captured {theme} theme screenshot ({len(png_bytes)} bytes)")
                return png_bytes
                
            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_file_path)
                except Exception as e:
                    logger.warning(f"Could not delete temporary file {temp_file_path}: {e}")
            
        except Exception as e:
            logger.error(f"Error capturing {theme} screenshot: {e}")
            return None
    
    def save_screenshot_to_field(self, coach_content, png_bytes: bytes, theme: str) -> bool:
        """
        Save PNG bytes to the appropriate ImageField.
        
        Args:
            coach_content: CoachContent model instance
            png_bytes: PNG image data
            theme: 'light' or 'dark'
            
        Returns:
            Boolean indicating success
        """
        try:
            # Generate filename
            purpose = coach_content.purpose or 'unknown'
            filename = f"cc_{coach_content.id}_{purpose}_{theme}.png"
            
            # Create ContentFile from bytes
            image_file = ContentFile(png_bytes, name=filename)
            
            # Save to appropriate field
            if theme == 'light':
                coach_content.screenshot_light.save(filename, image_file, save=True)
            else:
                coach_content.screenshot_dark.save(filename, image_file, save=True)
            
            logger.info(f"Saved {theme} screenshot for CoachContent #{coach_content.id}: {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving {theme} screenshot for CoachContent #{coach_content.id}: {e}")
            return False
    
    def _cleanup_driver(self):
        """Clean up the Chrome driver instance."""
        if self.driver:
            try:
                self.driver.quit()
            except Exception as e:
                logger.warning(f"Error closing Chrome driver: {e}")
            finally:
                self.driver = None
