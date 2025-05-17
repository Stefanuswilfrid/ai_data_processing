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

    "https://www.amazon.com.au/Apple-iPhone-Pro-Max-512GB/dp/B0B1DCBH5N",
    "https://www.jbhifi.com.au/products/apple-iphone-15-128gb-black?store=41&gad_source=1&gad_campaignid=17415673174&gbraid=0AAAAAD23EqpczcCU5c4VDY4umki4UD1-M&gclid=Cj0KCQjwxJvBBhDuARIsAGUgNfjrV9yKBcNzAlFHswjV3JqSj8HbXTeonuwbhPXP-NLVXNzxNAIn7oUaArbVEALw_wcB",
    "https://www.walmart.com/ip/Sony-WH-1000XM4-Wireless-Noise-Canceling-Over-the-Ear-Headphones-with-Google-Assistant-Black/310157752",
 
  ],
  grocery: [
    "https://www.woolworths.com.au/shop/productdetails/6006957/cadbury-dairy-milk-chocolate-block",
    "https://www.coles.com.au/product/coca-cola-classic-soft-drink-can-250ml-2034105",
    "https://www.woolworths.com.au/shop/productdetails/36066/arnotts-tim-tam-original-chocolate-biscuits",
  ],
  fashion: [
    "https://www.target.com.au/p/australian-cotton-classic-crew-neck-t-shirt/69768248",
    "https://www.kmart.com.au/product/shapewear-jeans-s161397/",
    "https://www.theiconic.com.au/air-force-1-07-men-s-2352119.html",
  ],
};
