import jsPDF from 'jspdf';

const getDataUri = (url) => {
    return new Promise((resolve) => {
        if (!url) { resolve(null); return; }
        const image = new Image();
        image.setAttribute('crossOrigin', 'anonymous');
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            canvas.getContext('2d').drawImage(image, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        image.onerror = () => resolve(null);
        image.src = url;
    });
};

export const generateAppointmentReceipt = async (agendamento) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const pdfData = agendamento.detalhes_pdf || {};
    const primaryColor = [37, 99, 235]; // Blue 600
    const secondaryColor = [100, 116, 139]; // Slate 500
    const textColor = [30, 41, 59]; // Slate 800
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxHeight = pageHeight / 2;

    // Carregamento do Logo
    let logoData = null;
    if (pdfData.clinica_logo) {
        logoData = await getDataUri(pdfData.clinica_logo);
    }

    // --- CONFIGURACOES GERAIS ---
    const marginLeft = 15;
    const contentWidth = pageWidth - (marginLeft * 2);
    let y = 12;

    // --- CONSTRUCAO DO ENDERECO COMPLETO ---
    const enderecoCompletoClinica = [
        pdfData.clinica_endereco,
        pdfData.clinica_numero ? `no ${pdfData.clinica_numero}` : null,
        pdfData.clinica_complemento ? `(${pdfData.clinica_complemento})` : null,
        pdfData.clinica_bairro ? `- ${pdfData.clinica_bairro}` : null,
        pdfData.clinica_cidade ? `- ${pdfData.clinica_cidade}` : null
    ].filter(Boolean).join(' ');

    const telefoneClinica = pdfData.clinica_telefone || "";

    // ================= 1. CABECALHO =================
    if (logoData) {
        doc.addImage(logoData, 'PNG', marginLeft, y, 18, 18);
        
        // Nome da Clinica
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(pdfData.clinica_nome?.toUpperCase() || "THECLINIC", marginLeft + 22, y + 6);
        
        // Endereco no Cabecalho
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        
        const enderecoLines = doc.splitTextToSize(enderecoCompletoClinica, contentWidth - 10);
        doc.text(enderecoLines, marginLeft + 22, y + 10);
        
        if (telefoneClinica) {
            doc.text(`Tel: ${telefoneClinica}`, marginLeft + 22, y + 10 + (enderecoLines.length * 3));
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text("COMPROVANTE DE AGENDAMENTO", marginLeft + 22, y + 18);
    } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(pdfData.clinica_nome?.toUpperCase() || "THECLINIC", marginLeft, y);
        y += 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        
        const enderecoLines = doc.splitTextToSize(enderecoCompletoClinica, contentWidth);
        doc.text(enderecoLines, marginLeft, y);
        y += (enderecoLines.length * 4.5);
        
        if (telefoneClinica) {
            doc.text(`Tel: ${telefoneClinica}`, marginLeft, y);
            y += 4.5;
        }
        
        y += 2;
    }

    y = logoData ? 34 : y + 6;

    // ================= 2. CARD DE DATA E HORA =================
    doc.setFillColor(248, 250, 252); // bg-slate-50
    doc.roundedRect(marginLeft, y, contentWidth, 18, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("DETALHES DA CONSULTA", marginLeft + 4, y + 6);

    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const dataFormatada = new Date(agendamento.data).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`${dataFormatada.toUpperCase()}`, marginLeft + 4, y + 13);
    
    doc.setFontSize(11);
    doc.text(`HORARIO: ${agendamento.horario.substring(0, 5)}`, marginLeft + contentWidth - 35, y + 13);

    y += 24;

    // ================= 3. INFORMACOES DO PACIENTE =================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("INFORMACOES DO PACIENTE", marginLeft, y);
    
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(marginLeft, y + 2, marginLeft + contentWidth, y + 2);
    y += 7.5;

    const drawField = (label, value, xPos, yPos) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(label.toUpperCase(), xPos, yPos);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(value || "-", xPos, yPos + 4);
    };

    drawField("Nome Completo", agendamento.nome_paciente, marginLeft, y);
    y += 8.5;
    drawField("CPF / Documento", pdfData.paciente_cpf, marginLeft, y);
    drawField("Data de Nascimento", pdfData.paciente_nascimento ? new Date(pdfData.paciente_nascimento).toLocaleDateString('pt-BR') : "-", marginLeft + 62, y);
    drawField("Sexo", pdfData.paciente_sexo, marginLeft + 120, y);
    y += 8.5;
    drawField("Telefone de Contato", agendamento.telefone_paciente, marginLeft, y);
    drawField("Convenio / Plano", agendamento.nome_convenio || "PARTICULAR", marginLeft + 62, y);
    y += 8.5;
    drawField("Endereco", `${pdfData.paciente_endereco || ''}, ${pdfData.paciente_cidade || ''}`, marginLeft, y);

    y += 11;

    // ================= 4. INFORMACOES MEDICAS =================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("CORPO CLINICO E LOCAL", marginLeft, y);
    doc.line(marginLeft, y + 2, marginLeft + contentWidth, y + 2);
    y += 7.5;

    drawField("Profissional", agendamento.nome_profissional, marginLeft, y);
    y += 8.5;
    drawField("Especialidade (CBO)", agendamento.nome_especialidade, marginLeft, y);
    drawField("Registro Profissional", pdfData.profissional_registro, marginLeft + 90, y);
    y += 8.5;
    drawField("Unidade de Atendimento", pdfData.clinica_nome || "CONSULTORIO CENTRAL", marginLeft, y);

    // ================= 5. RODAPE =================
    const footerY = maxHeight - 6;
    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, footerY - 5, marginLeft + contentWidth, footerY - 5);
    
    doc.setFontSize(7);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`Este documento e um comprovante oficial de agendamento gerado pelo sistema TheClinic.`, marginLeft, footerY);
    doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, marginLeft, footerY + 3);
    
    doc.setFont("helvetica", "bold");
    doc.text("VIA DO PACIENTE", marginLeft + contentWidth, footerY, { align: 'right' });

    // Output
    window.open(doc.output('bloburl'), '_blank');
};
