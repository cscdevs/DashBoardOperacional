import { buscarPosicoesVeiculos } from './src/reports/rotas-supervisao/stc.js'; buscarPosicoesVeiculos().then(res => console.log('Sucesso: ', res.total)).catch(err => console.error('Erro: ', err));
