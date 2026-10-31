const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { uploadToCloudinary } = require('../src/middleware/upload');
const env = require('../src/config/env');

async function testCloudinary() {
  console.log('Testing Cloudinary upload...');
  console.log('cloudinaryConfigured:', env.cloudinaryConfigured);
  console.log('Cloud name:', env.CLOUDINARY_CLOUD_NAME);

  const dummyBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

  try {
    const res = await uploadToCloudinary(dummyBuffer, 'test_folder', 'test_image');
    console.log('Upload result:', res);
  } catch (err) {
    console.error('Cloudinary upload FAILED with error:', err);
  }
}

testCloudinary();
