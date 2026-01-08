import jsPDF from 'jspdf';

// Função auxiliar para carregar imagem via URL
const getDataUri = (url) => {
    return new Promise((resolve) => {
        if (!url) { resolve(null); return; }
        
        const image = new Image();
        image.setAttribute('crossOrigin', 'anonymous'); // Tenta evitar CORS
        
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            canvas.getContext('2d').drawImage(image, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        
        image.onerror = () => {
            // Se der erro ao carregar (ex: 404), retorna null e segue sem logo
            resolve(null);
        };

        image.src = url;
    });
}

// Transformei em ASYNC para esperar a imagem
export const generateAppointmentReceipt = async (agendamento) => {
    const doc = new jsPDF();
    const pdfData = agendamento.detalhes_pdf || {};
    
    // --- CARREGAR LOGO ---
    let logoData = null;
    if (pdfData.clinica_logo) {
        logoData = await getDataUri(pdfData.clinica_logo);
    }

    // --- CONFIGURAÇÕES DE FONTE ---
    const setBold = () => doc.setFont("helvetica", "bold");
    const setNormal = () => doc.setFont("helvetica", "normal");
    const setSmall = () => doc.setFontSize(9);
    const setRegular = () => doc.setFontSize(10);
    const setLarge = () => doc.setFontSize(12);

    let y = 20;

    // ================= CABEÇALHO COM LOGO =================
    
    // Se tiver logo, desenha na esquerda (x=10, y=10) e empurra o texto pra direita
    const textX = logoData ? 50 : 20; 

    if (logoData) {
        // addImage(data, format, x, y, width, height)
        doc.addImage(logoData, 'PNG', 10, 10, 30, 30);
        // Ajusta Y para ficar alinhado ao lado do logo
        y = 20; 
    }

    setBold(); setLarge();
    doc.text(pdfData.clinica_nome || "TheClinic System", textX, y);
    
    y += 6;
    setNormal(); setSmall();
    doc.text("Comprovante de Agendamento de Consultas", textX, y);
    
    // Se tiver logo, garantimos que a linha comece abaixo dele
    y = logoData ? 45 : y + 10;

    doc.setLineWidth(0.5);
    doc.line(10, y, 200, y);
    y += 6;

    // ================= DADOS DO PACIENTE =================
    setBold(); setLarge();
    doc.text("DADOS DO PACIENTE", 10, y);
    y += 8;

    setBold(); setRegular();
    doc.text("Paciente:", 10, y);
    setNormal();
    doc.text(`${agendamento.nome_paciente} - CPF: ${pdfData.paciente_cpf || '-'}`, 35, y);
    y += 6;

    setBold();
    doc.text("Nascimento:", 10, y);
    setNormal();
    const nasc = pdfData.paciente_nascimento ? new Date(pdfData.paciente_nascimento).toLocaleDateString('pt-BR') : '-';
    doc.text(nasc, 35, y);

    setBold();
    doc.text("Sexo:", 80, y);
    setNormal();
    doc.text(pdfData.paciente_sexo || '-', 95, y);

    setBold();
    doc.text("Telefone:", 140, y);
    setNormal();
    doc.text(agendamento.telefone_paciente || '-', 160, y);
    y += 6;

    setBold();
    doc.text("Nome da Mãe:", 10, y);
    setNormal();
    doc.text(pdfData.paciente_mae || 'Não informado', 38, y);
    y += 6;

    setBold();
    doc.text("Endereço:", 10, y);
    setNormal();
    doc.text(`${pdfData.paciente_endereco || ''} - ${pdfData.paciente_cidade || ''}`, 30, y);
    
    y += 4;
    doc.line(10, y, 200, y);
    y += 6;

    // ================= LOCAL DE ATENDIMENTO =================
    setBold(); setLarge();
    doc.text("LOCAL DE ATENDIMENTO", 10, y);
    y += 8;

    setBold(); setRegular();
    doc.text("Data/Hora:", 10, y);
    setNormal();
    const dataF = new Date(agendamento.data + 'T' + agendamento.horario).toLocaleString('pt-BR');
    doc.text(dataF, 35, y);
    y += 6;

    setBold();
    doc.text("Local:", 10, y);
    setNormal();
    doc.text(pdfData.clinica_nome || "Consultório Principal", 35, y);
    y += 6;

    setBold();
    doc.text("Endereço:", 10, y);
    setNormal();
    doc.text(`${pdfData.clinica_endereco || ''} - ${pdfData.clinica_bairro || ''}`, 35, y);
    y += 6;

    // ================= PROFISSIONAL =================
    setBold();
    doc.text("Profissional:", 10, y);
    setNormal();
    doc.text(agendamento.nome_profissional, 35, y);
    y += 6;

    setBold();
    doc.text("Especialidade:", 10, y);
    setNormal();
    doc.text(agendamento.nome_especialidade, 38, y);
    
    setBold();
    doc.text("Registro:", 140, y);
    setNormal();
    doc.text(pdfData.profissional_registro || '', 160, y);
    y += 6;

    setBold();
    doc.text("Convênio:", 10, y);
    setNormal();
    doc.text(agendamento.nome_convenio || "Particular", 35, y);

    y += 8;
    doc.line(10, y, 200, y);
    y += 6;

    // Rodapé
    setNormal(); setSmall();
    doc.text("Emitido em: " + new Date().toLocaleString('pt-BR'), 10, y);
    doc.text("TheClinic", 170, y);

    window.open(doc.output('bloburl'), '_blank');
};