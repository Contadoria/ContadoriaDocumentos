/**
* @fileOverview
* Modulo das rotinas principais do aplicativo.
*/

function abrirApp(state) {
  var html = HtmlService.createTemplateFromFile('_index');
  html.dadosDrive = JSON.stringify(obterDadosDrive(state));
  return html.evaluate()
  .addMetaTag('viewport', 'width=device-width, initial-scale=1')
  .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
  .setTitle(Config_.UI.TITULO)
  .setFaviconUrl(Config_.UI.FAVICON_URL);
}

function obterDadosDrive(state) {
  
  try {
    
    if (Array.isArray(state.exportIds)) {
      
      var planilhas = state.exportIds.map(function(id) {
        return Drive.Files.get(id);
      });
      var idPastaDestino = planilhas[0].parents[0].id;
      
    } else {
      
      var planilhas = [];
      var idPastaDestino = state.folderId;
    }
    
    return {
      idPastaDestino: idPastaDestino,
      planilhas: planilhas
    };
    
  } catch (e) {
    Erros_.informar(e).logCentral();
    throw e;
  }
}

function obterCredenciais() {
  return {
    developerKey: PropertiesService.getScriptProperties().getProperty(Config_.STORAGE.GOOGLE.PICKER_KEY),
    token: ScriptApp.getOAuthToken()
  };
}

function criarDocumentos(dados) {
  
  try {
    
    var identificadorOK = dados && dados.identificador;
    var idPastaDestinoOK = dados && dados.idPastaDestino;
    var planilhasOK = dados && Array.isArray(dados.planilhas) && dados.planilhas.length > 0;
    var modelosOK = dados && Array.isArray(dados.modelos) && dados.modelos.length > 0;
    
    if (identificadorOK && idPastaDestinoOK && planilhasOK && modelosOK) {
      
      var pasta = DriveApp.getFolderById(dados.idPastaDestino);
      
      var planilhas = dados.planilhas.map(function(planilha) {
        return SpreadsheetApp.openById(planilha.id);
      }).sort(function (planilha1, planilha2) {
        var intervaloTipo1 = planilha1.getRangeByName(Config_.PLANILHA.INTERVALO.TIPO);
        var intervaloTipo2 = planilha2.getRangeByName(Config_.PLANILHA.INTERVALO.TIPO);
        var tipo1 = intervaloTipo1 ? intervaloTipo1.getValue().toUpperCase() : '';
        var tipo2 = intervaloTipo2 ? intervaloTipo2.getValue().toUpperCase() : '';
        var peso = {
          TC: 2,
          RMI: 1,
          ATRASADOS: 0
        };
        var peso1 = peso[tipo1] || 3;
        var peso2 = peso[tipo2] || 3;
        return peso1 < peso2 ? -1 : (peso1 > peso2 ? 1 : 0);
      });
      
      return dados.modelos.map(function(modelo) {
        var id = DriveApp.getFileById(modelo.id).makeCopy(dados.identificador.trim() + ' (' + modelo.name + ')', pasta).getId();
        var doc = DocumentApp.openById(id);
        return Modelos.preencher(doc, planilhas); // deve retornar url do arquivo
      });
      
    } else {
      throw new Error('Os parâmetros fornecidos estão irregulares.')
    }
  } catch (e) {
    Erros_.informar(e).logCentral();
    throw e;
  }
}