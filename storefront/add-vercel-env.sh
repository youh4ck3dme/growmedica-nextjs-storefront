#!/bin/bash

# Vercel Environment Configuration Script
# This script adds all required environment variables to your Vercel project via Vercel CLI.

echo "===================================================="
echo "Configuring Vercel Environment Variables for GrowMedica"
echo "===================================================="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "ERROR: Vercel CLI is not installed."
    echo "Please install it by running: npm install -g vercel"
    exit 1
fi

# Target Environments
ENVIRONMENTS=("production" "preview" "development")

add_env_var() {
    local name=$1
    local value=$2
    
    echo "Adding $name..."
    for env in "${ENVIRONMENTS[@]}"; do
        # Pipe value to prevent interactive prompt
        echo -n "$value" | vercel env add "$name" "$env" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "  - Added to $env"
        else
            # Try to pull/overwrite or show notice
            echo "  - Notice: $name in $env might already exist or needs manual check."
        fi
    done
}

# 1. Shopify Store Domain
add_env_var "NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN" "tn43yx-0k.myshopify.com"

# 2. Shopify Storefront Access Token
add_env_var "NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN" "2c8fd10ebe58e830aeb025800e3874ea"

# 3. Shopify Revalidation Secret
add_env_var "SHOPIFY_REVALIDATION_SECRET" "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"

# 4. Site URL
add_env_var "NEXT_PUBLIC_SITE_URL" "https://growmedical.sk"

echo "===================================================="
echo "Done! Run 'vercel deploy' or 'git push' to deploy."
echo "===================================================="
