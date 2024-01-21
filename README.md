# Dungyzon API Web Scraper

## Overview
Dungyzon API Web Scraper is a sophisticated tool designed for efficient data extraction from e-commerce websites. This Node.js and Express-based API focuses on gathering detailed product information, user reviews, and current offers.

## Features
- **Product Information**: Retrieves detailed descriptions and specifications of products.
- **User Reviews**: Gathers user-generated reviews for a comprehensive understanding of products.
- **Product Offers**: Provides up-to-date information about special offers and discounts.

## Getting Started
Follow these steps to set up and run the application:

### Prerequisites
- Node.js (v17.9.0 or higher)
- npm (Node Package Manager)

### Installation
1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Run `npm install` to install all required dependencies.

### Environment Setup
- Create a `.env` file in the root directory.
- Define necessary environment variables, such as `PORT`.

### Running the Application
- For development: `npm run dev`
- For production: `npm start`

## Endpoints
The API provides several endpoints:

- `GET /`: Welcome message.
- `GET /products/:productId`: Product details.
- `GET /products/:productId/reviews`: Product reviews.
- `GET /products/:productId/offers`: Product offers.

## License
This project is licensed under the ISC License. See the LICENSE file for details.
