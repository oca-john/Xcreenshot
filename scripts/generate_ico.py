#!/usr/bin/env python3
"""
Generate all icons for Xcreenshot application
Generates:
- All PNG sizes for Tauri (including Windows Store logos)
- Windows ICO file
- macOS ICNS file
- Public folder icons
"""

from PIL import Image
import os
import struct
import shutil

# Icon output directory
ICONS_DIR = "src-tauri/icons"
PUBLIC_DIR = "public"
SOURCE_FILE = "src-tauri/icons/icon.png"

# Tauri required PNG sizes
TAURI_PNG_SIZES = {
    "32x32.png": 32,
    "128x128.png": 128,
    "128x128@2x.png": 256,
    "icon.png": 512,  # System tray icon
}

# Windows Store logo sizes
WINDOWS_STORE_SIZES = {
    "Square30x30Logo.png": 30,
    "Square44x44Logo.png": 44,
    "Square71x71Logo.png": 71,
    "Square89x89Logo.png": 89,
    "Square107x107Logo.png": 107,
    "Square142x142Logo.png": 142,
    "Square150x150Logo.png": 150,
    "Square284x284Logo.png": 284,
    "Square310x310Logo.png": 310,
    "StoreLogo.png": 50,
}

# Public folder icons
PUBLIC_SIZES = {
    "icon-32.png": 32,
    "icon-128.png": 128,
}

# ICO sizes (Windows)
ICO_SIZES = [16, 32, 48, 64, 128, 256]

# ICNS sizes (macOS) - max 512 based on source image
ICNS_SIZES = {
    'ic07': 128,   # 128x128
    'ic08': 256,   # 256x256
    'ic09': 512,   # 512x512
    'ic11': 32,    # 16x16@2x
    'ic12': 64,    # 32x32@2x
    'ic13': 256,   # 128x128@2x
    'ic14': 512,   # 256x256@2x
}


def load_source_image(path):
    """Load source image and convert to RGBA"""
    print(f"📂 Loading source image: {path}")
    img = Image.open(path)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    print(f"   Size: {img.size}, Mode: {img.mode}")
    return img


def resize_image(img, size):
    """Resize image with high quality resampling"""
    return img.resize((size, size), Image.Resampling.LANCZOS)


def generate_png_icons(img, sizes_dict, output_dir):
    """Generate PNG icons for given sizes dictionary"""
    for filename, size in sizes_dict.items():
        output_path = os.path.join(output_dir, filename)
        resized = resize_image(img, size)
        resized.save(output_path, 'PNG', optimize=True)
        file_size = os.path.getsize(output_path)
        print(f"   ✅ {filename} ({size}x{size}) - {file_size:,} bytes")


def generate_ico(img, output_path):
    """Generate Windows ICO file with multiple sizes"""
    print(f"\n🪟  Generating Windows ICO: {output_path}")
    
    # Create list of resized images
    sizes = [(s, s) for s in ICO_SIZES]
    img.save(output_path, format='ICO', sizes=sizes)
    
    file_size = os.path.getsize(output_path)
    print(f"   ✅ icon.ico - {file_size:,} bytes")
    print(f"   Sizes: {ICO_SIZES}")


def generate_icns(img, output_path):
    """Generate macOS ICNS file"""
    print(f"\n🍎 Generating macOS ICNS: {output_path}")
    
    # ICNS file format
    icns_data = b'icns'
    icons_data = b''
    
    for icon_type, size in ICNS_SIZES.items():
        # Resize image
        resized = resize_image(img, size)
        
        # Save as PNG in memory
        import io
        png_buffer = io.BytesIO()
        resized.save(png_buffer, format='PNG')
        png_data = png_buffer.getvalue()
        
        # ICNS icon entry: type (4 bytes) + length (4 bytes) + data
        icon_entry = icon_type.encode('ascii') + struct.pack('>I', len(png_data) + 8) + png_data
        icons_data += icon_entry
    
    # Calculate total file size
    total_size = len(icons_data) + 8  # 8 bytes for header
    
    # Write ICNS file
    with open(output_path, 'wb') as f:
        f.write(b'icns')
        f.write(struct.pack('>I', total_size))
        f.write(icons_data)
    
    file_size = os.path.getsize(output_path)
    print(f"   ✅ icon.icns - {file_size:,} bytes")
    print(f"   Sizes: {list(set(ICNS_SIZES.values()))}")


def main():
    print("=" * 50)
    print("🎨 Xcreenshot Icon Generator")
    print("=" * 50)
    
    # Check source file
    if not os.path.exists(SOURCE_FILE):
        print(f"❌ Source file not found: {SOURCE_FILE}")
        return 1
    
    # Ensure output directories exist
    os.makedirs(ICONS_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    # Load source image
    img = load_source_image(SOURCE_FILE)
    
    # Generate Tauri PNG icons
    print(f"\n📦 Generating Tauri PNG icons in {ICONS_DIR}/")
    generate_png_icons(img, TAURI_PNG_SIZES, ICONS_DIR)
    
    # Generate Windows Store logos
    print(f"\n🏪 Generating Windows Store logos in {ICONS_DIR}/")
    generate_png_icons(img, WINDOWS_STORE_SIZES, ICONS_DIR)
    
    # Generate public folder icons
    print(f"\n🌐 Generating public folder icons in {PUBLIC_DIR}/")
    generate_png_icons(img, PUBLIC_SIZES, PUBLIC_DIR)
    
    # Generate Windows ICO
    generate_ico(img, os.path.join(ICONS_DIR, "icon.ico"))
    
    # Generate macOS ICNS
    generate_icns(img, os.path.join(ICONS_DIR, "icon.icns"))
    
    print("\n" + "=" * 50)
    print("✅ All icons generated successfully!")
    print("=" * 50)
    print("\n📋 Summary:")
    print(f"   - Tauri PNGs: {len(TAURI_PNG_SIZES)} files")
    print(f"   - Windows Store: {len(WINDOWS_STORE_SIZES)} files")
    print(f"   - Public folder: {len(PUBLIC_SIZES)} files")
    print(f"   - Windows ICO: 1 file ({len(ICO_SIZES)} sizes)")
    print(f"   - macOS ICNS: 1 file ({len(ICNS_SIZES)} sizes)")
    
    return 0


if __name__ == "__main__":
    exit(main())
