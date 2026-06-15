const fs = require('fs');

// Convert textTasks
const textContent = fs.readFileSync('data/textTasks.ts', 'utf8');
const textMatch = textContent.match(/export const TEXT_TASKS: Task\[\] = (\[[\s\S]*\]);/);
if (textMatch) {
  let jsonStr = textMatch[1];
  jsonStr = jsonStr.replace(/,(\s*[\]}])/g, '$1');
  const textTasks = eval(jsonStr);
  fs.writeFileSync('data/textTasks.json', JSON.stringify(textTasks, null, 2));
}

// Convert imageTasks
const imgContent = fs.readFileSync('data/imageTasks.ts', 'utf8');
const imgMatch = imgContent.match(/export const IMAGE_TASKS: ImageTask\[\] = (\[[\s\S]*\]);/);
if (imgMatch) {
  let arrayStr = imgMatch[1];
  
  // Replace require("../assets/images/tasks/filename.png") with "filename"
  arrayStr = arrayStr.replace(/require\(['"]\.\.\/assets\/images\/tasks\/([^.]+)\.png['"]\)/g, '"$1"');
  
  const imgTasks = eval(arrayStr);
  
  const formattedImgTasks = imgTasks.map(t => ({
    id: t.id,
    imageName: t.imageSource, // now the filename string
    caption: t.caption,
    reactionPrompt: t.reactionPrompt,
    level: t.level
  }));
  fs.writeFileSync('data/imageTasks.json', JSON.stringify(formattedImgTasks, null, 2));
}
