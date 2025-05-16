import { put } from "@vercel/blob"
import fs from "fs"

async function upload() {
  const file = new File([Buffer.from("Hello")], "hello.txt", {
    type: "text/plain",
  })

  const { url } = await put("test/hello.txt", file, {
    access: "public",
    token: "harcode", // hardcoded
  })

  console.log("Success! Uploaded to:", url)
}

upload().catch(console.error)
