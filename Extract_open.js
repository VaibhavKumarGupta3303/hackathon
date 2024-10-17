import officeParser from 'officeparser';
import OpenAI from "openai";
import fs from 'fs';
import { config } from 'dotenv';
import Tesseract from 'tesseract.js';
import path from 'path';

// Load environment variables
config({ path: 'src/assets/key.env' });

const openai = new OpenAI({ apiKey:"isnert key"});


async function fun() {
    const pdfPath = process.env.first_file;

    // Helper function to get the file type
    function getFileType(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        switch (ext) {
            case '.pdf':
                return 'PDF Document';
            case '.docx':
                return 'Word Document';
            case '.jpg':
            case '.jpeg':
            case '.png':
                return 'Image File';
            default:
                return 'Unknown file type';
        }
    }

    // Check if the PDF file exists
    if (!fs.existsSync(pdfPath)) {
        console.error(`The file ${pdfPath} does not exist.`);
        return;
    } else {
        console.log("Path is correct");
    }

    const fileType = getFileType(pdfPath);
    let result;

    // Parse the file depending on its type
    if (fileType === 'PDF Document' || fileType === 'Word Document') {
        result = new Promise((resolve, reject) => {
            officeParser.parseOffice(pdfPath, function (data, err) {
                if (err) {
                    reject("Error reading the file: " + err);
                } else if (data) {
                    resolve(data);
                } else {
                    reject("No data found in the file.");
                }
            });
        });
    } else if (fileType === 'Image File') {
        result = Tesseract.recognize(
            pdfPath, 'eng', {
                logger: info => console.log(info)
            }
        ).then(({ data: { text } }) => {
            console.log("Extracted text from the image:", text);
            return text;
        }).catch(err => {
            console.error("Tesseract error:", err);
        });
    } else {
        console.log("File type not recognized");
        return;
    }
    

    try {
        const extractedText = await result;

        // Use OpenAI's Chat API to process the extracted text
        const messages = [
            { role: "system", content: "You are a helpful assistant that extracts relevant information from documents and formats it into readable JSON." },
            { role: "user", content: `Extract all the necessary data in a readable JSON format from the following text and the category should be in this format job title, responsibilities,qualification, experience,local,specific_application_instructions
               "jobs" :  {
                    "job id": stard this by one and increase it for other jobs
                    "job_title": "PHP/Fullstack Software Developer",
                    "responsibilities": [...],
                    "qualification": [....],
                    "experience": "....",
                    "local": "...",
                    "specific_application_instructions": "..."
                }
                    you can create any many json object in this format , if there are more same format should be used
                : ${extractedText} and return in the form of objects not array` }
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-4", // or "gpt-3.5-turbo"
            messages: messages,
            max_tokens: 1500, // Adjust token limit based on your needs
        });

        const responseData = completion.choices[0].message.content
            .replace(/#/g, '') // Remove '#' symbols
            .replace(/\*/g, '') // Remove '*' symbols
            .replace(/(\r\n|\n|\r)/g, '\n') // Normalize all new lines to '\n'
            .replace(/`/g, '');

        // Save the result to a file
        fs.writeFileSync('Extracted_Data.json', responseData, 'utf8');
        console.log("Response saved to Extracted_Data.json");

        return responseData;
    } catch (error) {
        console.error("Error:", error);
    }
}

let extracted_data = fun();
export { extracted_data };
export default fun;
