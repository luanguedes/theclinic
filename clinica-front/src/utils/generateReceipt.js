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
        format: [148, 210]
    });

    const pdfData = agendamento.detalhes_pdf || {};
    const primaryColor = [37, 99, 235]; // Blue 600
    const secondaryColor = [100, 116, 139]; // Slate 500
    const textColor = [30, 41, 59]; // Slate 800
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Carregamento do Logo
    let logoData = null;
    if (pdfData.clinica_logo) {
        logoData = await getDataUri(pdfData.clinica_logo);
    }

    // --- CONFIGURACOES GERAIS ---
    const marginLeft = 10;
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
        doc.setFontSize(14);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(pdfData.clinica_nome?.toUpperCase() || "THECLINIC", marginLeft + 22, y + 6);
        
        // Endereco no Cabecalho
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        
        const enderecoLines = doc.splitTextToSize(enderecoCompletoClinica, contentWidth - 24);
        doc.text(enderecoLines, marginLeft + 22, y + 10);
        
        if (telefoneClinica) {
            doc.text(`Tel: ${telefoneClinica}`, marginLeft + 22, y + 10 + (enderecoLines.length * 3));
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("COMPROVANTE DE AGENDAMENTO", marginLeft + 22, y + 18);
    } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(pdfData.clinica_nome?.toUpperCase() || "THECLINIC", marginLeft, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        
        const enderecoLines = doc.splitTextToSize(enderecoCompletoClinica, contentWidth);
        doc.text(enderecoLines, marginLeft, y);
        y += (enderecoLines.length * 3);
        
        if (telefoneClinica) {
            doc.text(`Tel: ${telefoneClinica}`, marginLeft, y);
            y += 4;
        }
        
        y += 2;
    }

    y = logoData ? 34 : y + 6;

    // ================= 2. CARD DE DATA E HORA =================
    doc.setFillColor(248, 250, 252); // bg-slate-50
    doc.roundedRect(marginLeft, y, contentWidth, 18, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("DETALHES DA CONSULTA", marginLeft + 4, y + 6);

    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const dataFormatada = new Date(agendamento.data).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`${dataFormatada.toUpperCase()}`, marginLeft + 4, y + 13);
    
    doc.setFontSize(10);
    doc.text(`HORARIO: ${agendamento.horario.substring(0, 5)}`, marginLeft + contentWidth - 4, y + 13, { align: 'right' });

    y += 26;

    // ================= 3. INFORMACOES DO PACIENTE =================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("INFORMACOES DO PACIENTE", marginLeft, y);
    
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(marginLeft, y + 2, marginLeft + contentWidth, y + 2);
    y += 7;

    const drawField = (label, value, xPos, yPos) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(label.toUpperCase(), xPos, yPos);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(value || "-", xPos, yPos + 4);
    };

    drawField("Nome Completo", agendamento.nome_paciente, marginLeft, y);
    y += 9;
    drawField("CPF / Documento", pdfData.paciente_cpf, marginLeft, y);
    drawField("Data de Nascimento", pdfData.paciente_nascimento ? new Date(pdfData.paciente_nascimento).toLocaleDateString('pt-BR') : "-", marginLeft + 70, y);
    y += 9;
    drawField("Telefone de Contato", agendamento.telefone_paciente, marginLeft, y);
    drawField("Sexo", pdfData.paciente_sexo, marginLeft + 70, y);
    y += 9;
    drawField("Endereco", `${pdfData.paciente_endereco || ''}, ${pdfData.paciente_cidade || ''}`, marginLeft, y);

    y += 14;

    // ================= 4. INFORMACOES MEDICAS =================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("CORPO CLINICO E LOCAL", marginLeft, y);
    doc.line(marginLeft, y + 2, marginLeft + contentWidth, y + 2);
    y += 7;

    drawField("Profissional", agendamento.nome_profissional, marginLeft, y);
    y += 9;
    drawField("Especialidade", agendamento.nome_especialidade, marginLeft, y);
    drawField("Registro Profissional", pdfData.profissional_registro, marginLeft + 70, y);
    y += 9;
    drawField("Convenio / Plano", agendamento.nome_convenio || "PARTICULAR", marginLeft, y);
    drawField("Unidade de Atendimento", pdfData.clinica_nome || "CONSULTORIO CENTRAL", marginLeft + 70, y);
    y += 9;
    
    const enderecoLinesBody = doc.splitTextToSize(enderecoCompletoClinica, contentWidth);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("ENDERECO DA UNIDADE", marginLeft, y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(enderecoLinesBody, marginLeft, y + 4);

    // ================= 5. OBSERVACOES E ORIENTACOES =================
    y += 16;
    const orientacoesLines = doc.splitTextToSize([
        "- Chegue com 15 minutos de antecedencia para triagem e recepcao.",
        "- Apresente documento original com foto e carteirinha do convenio (se aplicavel).",
        "- Em caso de desistencia, avise com no minimo 24 horas de antecedencia.",
        `- Observacoes: ${agendamento.observacoes || "Nenhuma observacao especifica para este atendimento."}`
    ].join("\n"), contentWidth - 8);
    const orientacoesHeight = Math.max(20, (orientacoesLines.length * 3) + 8);

    doc.setFillColor(241, 245, 249); // bg-slate-100
    doc.roundedRect(marginLeft, y, contentWidth, orientacoesHeight, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("ORIENTACOES IMPORTANTES", marginLeft + 4, y + 6);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(orientacoesLines, marginLeft + 4, y + 11);

    // ================= 6. RODAPE =================
    const footerY = pageHeight - 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, footerY - 5, marginLeft + contentWidth, footerY - 5);
    
    doc.setFontSize(6);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`Este documento e um comprovante oficial de agendamento gerado pelo sistema TheClinic.`, marginLeft, footerY);
    doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, marginLeft, footerY + 3);
    
    doc.setFont("helvetica", "bold");
    doc.text("VIA DO PACIENTE", marginLeft + contentWidth, footerY, { align: 'right' });

    // Output
    window.open(doc.output('bloburl'), '_blank');
};
