"""
Feature Showcase Generator for Better Tabs AI
Creates a combined image showing all key features
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path


def create_feature_showcase():
    """Create a feature showcase combining existing screenshots"""
    print("🎨 Creating Feature Showcase...")
    
    screenshots_dir = Path("screenshots")
    if not screenshots_dir.exists():
        print("❌ Screenshots directory not found")
        return
    
    # Load existing screenshots
    images = {}
    image_files = {
        "overview": "01_full_interface_overview.png",
        "drag": "05_tab_being_dragged.png"
    }
    
    for key, filename in image_files.items():
        path = screenshots_dir / filename
        if path.exists():
            images[key] = Image.open(path)
            print(f"📸 Loaded: {filename}")
    
    if not images:
        print("❌ No images found to create showcase")
        return
    
    # Create a combined showcase image
    if "overview" in images and "drag" in images:
        overview = images["overview"]
        drag = images["drag"]
        
        # Resize images to consistent height
        target_height = 600
        overview = overview.resize((int(overview.width * target_height / overview.height), target_height))
        drag = drag.resize((int(drag.width * target_height / drag.height), target_height))
        
        # Create combined image
        total_width = overview.width + drag.width + 40  # 40px spacing
        showcase = Image.new('RGB', (total_width, target_height + 100), 'white')
        
        # Paste images
        showcase.paste(overview, (0, 50))
        showcase.paste(drag, (overview.width + 40, 50))
        
        # Add title
        draw = ImageDraw.Draw(showcase)
        try:
            title_font = ImageFont.truetype("arial.ttf", 24)
            subtitle_font = ImageFont.truetype("arial.ttf", 16)
        except:
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
        
        # Title
        title = "Better Tabs AI - Complete Drag & Drop Tab Organization"
        title_bbox = draw.textbbox((0, 0), title, font=title_font)
        title_x = (total_width - title_bbox[2]) // 2
        draw.text((title_x, 10), title, fill="black", font=title_font)
        
        # Subtitles
        draw.text((overview.width // 2 - 100, target_height + 60), "🏠 Full Interface", fill="gray", font=subtitle_font)
        draw.text((overview.width + 40 + drag.width // 2 - 80, target_height + 60), "🎯 Drag & Drop", fill="gray", font=subtitle_font)
        
        # Save
        showcase_path = screenshots_dir / "feature_showcase.png"
        showcase.save(showcase_path)
        print(f"🎨 Saved: {showcase_path}")
        
        return showcase_path
    
    return None


def main():
    """Main showcase generation function"""
    print("🎨 Better Tabs AI - Feature Showcase Generator")
    print("=" * 55)
    
    showcase_path = create_feature_showcase()
    
    if showcase_path:
        print(f"\n✅ Feature showcase created!")
        print(f"📁 Saved to: {showcase_path}")
    else:
        print("❌ Could not create feature showcase")
    
    # List all files in screenshots
    screenshots_dir = Path("screenshots")
    if screenshots_dir.exists():
        all_files = list(screenshots_dir.glob("*"))
        print(f"\n📁 Total files in screenshots: {len(all_files)}")
        
        # Group by type
        pngs = [f for f in all_files if f.suffix == '.png']
        gifs = [f for f in all_files if f.suffix == '.gif']
        
        print(f"\n📸 Static Images ({len(pngs)}):")
        for file in sorted(pngs):
            print(f"   • {file.name}")
            
        print(f"\n🎬 Animated GIFs ({len(gifs)}):")
        for file in sorted(gifs):
            print(f"   • {file.name}")


if __name__ == "__main__":
    main()