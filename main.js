const PORT = 3000;

const express = require('express');
const app = express();

app.get('/*', express.static(`./site`));
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
