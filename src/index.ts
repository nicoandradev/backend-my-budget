import app from './app';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});

