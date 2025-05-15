export const INSTRUCTION_TEMPLATES = [
    {
      label: "Basic Product Info",
      value: "Extract the following information: Product Name, Price, Brand, Description, Image URL, and Availability.",
    },
    {
      label: "Grocery Products",
      value:
        "Extract the following information: Product Name, Regular Price, Sale Price (if any), Weight/Volume, Price per unit (e.g., $/kg), Nutritional Information (calories, protein, fat, carbs), and Ingredients list.",
    },
    {
      label: "Electronics",
      value:
        "Extract the following information: Product Name, Brand, Model Number, Price, Key Specifications, Warranty Information, Available Colors, and Customer Rating.",
    },
    {
      label: "Clothing",
      value:
        "Extract the following information: Product Name, Brand, Price, Available Sizes, Available Colors, Material Composition, Care Instructions, and Product Category.",
    },
    {
      label: "Home & Kitchen",
      value:
        "Extract the following information: Product Name, Brand, Price, Dimensions, Material, Color Options, Features, and Customer Reviews.",
    },
    {
      label: "Books",
      value:
        "Extract the following information: Title, Author, Publisher, Publication Date, ISBN, Price, Format (hardcover, paperback, etc.), Page Count, and Book Description.",
    },
]


export const SAMPLE_URLS = {
    electronics: [
      "https://www.amazon.com/Apple-iPhone-13-Pro-Max/dp/B09G9HD6PD",
      "https://www.bestbuy.com/site/samsung-galaxy-s21-5g-128gb-unlocked-phantom-gray/6448113.p",
      "https://www.walmart.com/ip/Sony-WH-1000XM4-Wireless-Noise-Cancelling-Overhead-Headphones-Black/485382896",
    ],
    grocery: [
      "https://www.woolworths.com.au/shop/productdetails/36155/cadbury-dairy-milk-chocolate-block",
      "https://shop.coles.com.au/a/national/product/coca-cola-soft-drink-can",
      "https://www.woolworths.com.au/shop/productdetails/77589/arnott-s-tim-tam-chocolate-biscuits-original",
    ],
    fashion: [
      "https://www.target.com.au/p/mens-short-sleeve-crew-neck-t-shirt/65567351",
      "https://www.kmart.com.au/product/womens-high-waist-jeans-s135649/",
      "https://www.theiconic.com.au/air-force-1-07-mens-shoes-1258026.html",
    ],
}