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
}

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

    // Carregamento do Logo
    let logoData = null;
    if (pdfData.clinica_logo) {
        logoData = await getDataUri(pdfData.clinica_logo);
    }

    // --- CONFIGURAÇÕES GERAIS ---
    const marginLeft = 20;
    const contentWidth = 170;
    let y = 20;

    // --- CONSTRUÇÃO DO ENDEREÇO COMPLETO ---
    const enderecoCompletoClinica = [
        pdfData.clinica_endereco,
        pdfData.clinica_numero ? `nº ${pdfData.clinica_numero}` : null,
        pdfData.clinica_complemento ? `(${pdfData.clinica_complemento})` : null,
        pdfData.clinica_bairro ? `- ${pdfData.clinica_bairro}` : null,
        pdfData.clinica_cidade ? `- ${pdfData.clinica_cidade}` : null
    ].filter(Boolean).join(' ');

    const telefoneClinica = pdfData.clinica_telefone || "";

    // ================= 1. CABEÇALHO (BRANDING MELHORADO) =================
    if (logoData) {
        doc.addImage(logoData, 'PNG', marginLeft, y, 25, 25);
        
        // Nome da Clínica
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(pdfData.clinica_nome?.toUpperCase() || "THECLINIC", 52, y + 8);
        
        // Endereço no Cabeçalho (NOVO)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        
        // Quebra o endereço se for muito longo
        const enderecoLines = doc.splitTextToSize(enderecoCompletoClinica, 130);
        doc.text(enderecoLines, 52, y + 14);
        
        // Telefone
        if(telefoneClinica) {
            doc.text(`Tel: ${telefoneClinica}`, 52, y + 14 + (enderecoLines.length * 4));
        }

        // Título do Documento
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("COMPROVANTE DE AGENDAMENTO", 52, y + 24);

    } else {
        // Sem logo (Alinhado à esquerda)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(pdfData.clinica_nome?.toUpperCase() || "THECLINIC", marginLeft, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        
        const enderecoLines = doc.splitTextToSize(enderecoCompletoClinica, 170);
        doc.text(enderecoLines, marginLeft, y);
        y += (enderecoLines.length * 5);
        
        if(telefoneClinica) {
            doc.text(`Tel: ${telefoneClinica}`, marginLeft, y);
            y += 6;
        }
        
        y += 4;
    }

    y = logoData ? 60 : y + 15; // Ajuste dinâmico da altura

    // ================= 2. CARD DE DATA E HORA (DESTAQUE) =================
    doc.setFillColor(248, 250, 252); // bg-slate-50
    doc.roundedRect(marginLeft, y, contentWidth, 25, 3, 3, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("DETALHES DA CONSULTA", marginLeft + 5, y + 8);

    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const dataFormatada = new Date(agendamento.data).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`${dataFormatada.toUpperCase()}`, marginLeft + 5, y + 17);
    
    doc.setFontSize(16);
    doc.text(`HORÁRIO: ${agendamento.horario.substring(0, 5)}`, marginLeft + 115, y + 17);

    y += 40;

    // ================= 3. INFORMAÇÕES DO PACIENTE =================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("INFORMAÇÕES DO PACIENTE", marginLeft, y);
    
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(marginLeft, y + 2, marginLeft + contentWidth, y + 2);
    y += 10;

    const drawField = (label, value, xPos, yPos, w) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(label.toUpperCase(), xPos, yPos);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(value || "-", xPos, yPos + 5);
    };

    drawField("Nome Completo", agendamento.nome_paciente, marginLeft, y, 100);
    drawField("CPF / Documento", pdfData.paciente_cpf, marginLeft + 110, y, 60);
    y += 15;
    drawField("Data de Nascimento", pdfData.paciente_nascimento ? new Date(pdfData.paciente_nascimento).toLocaleDateString('pt-BR') : "-", marginLeft, y, 50);
    drawField("Telefone de Contato", agendamento.telefone_paciente, marginLeft + 60, y, 50);
    drawField("Sexo", pdfData.paciente_sexo, marginLeft + 110, y, 40);
    y += 15;
    drawField("Endereço", `${pdfData.paciente_endereco || ''}, ${pdfData.paciente_cidade || ''}`, marginLeft, y, 170);

    y += 25;

    // ================= 4. INFORMAÇÕES MÉDICAS =================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("CORPO CLÍNICO E LOCAL", marginLeft, y);
    doc.line(marginLeft, y + 2, marginLeft + contentWidth, y + 2);
    y += 10;

    drawField("Profissional", agendamento.nome_profissional, marginLeft, y, 80);
    drawField("Especialidade", agendamento.nome_especialidade, marginLeft + 80, y, 50);
    drawField("Registro Profissional", pdfData.profissional_registro, marginLeft + 130, y, 40);
    y += 15;
    drawField("Convênio / Plano", agendamento.nome_convenio || "PARTICULAR", marginLeft, y, 80);
    drawField("Unidade de Atendimento", pdfData.clinica_nome || "CONSULTÓRIO CENTRAL", marginLeft + 80, y, 90);
    y += 15;
    
    // Aqui usamos a variável que já montamos lá em cima
    const enderecoLinesBody = doc.splitTextToSize(enderecoCompletoClinica, 170);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("ENDEREÇO DA UNIDADE", marginLeft, y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(enderecoLinesBody, marginLeft, y + 5);

    // ================= 5. OBSERVAÇÕES E ORIENTAÇÕES =================
    y += 30;
    doc.setFillColor(241, 245, 249); // bg-slate-100
    doc.roundedRect(marginLeft, y, contentWidth, 35, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("ORIENTAÇÕES IMPORTANTES", marginLeft + 5, y + 7);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const lines = [
        "- Chegue com 15 minutos de antecedência para triagem e recepção.",
        "- Apresente documento original com foto e carteirinha do convênio (se aplicável).",
        "- Em caso de desistência, avise com no mínimo 24 horas de antecedência.",
        `- Observações: ${agendamento.observacoes || "Nenhuma observação específica para este atendimento."}`
    ];
    doc.text(lines, marginLeft + 5, y + 14);

    // ================= 6. RODAPÉ (FOOTER) =================
    const footerY = 280;
    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, footerY - 5, marginLeft + contentWidth, footerY - 5);
    
    doc.setFontSize(7);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`Este documento é um comprovante oficial de agendamento gerado pelo sistema TheClinic.`, marginLeft, footerY);
    doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, marginLeft, footerY + 4);
    
    doc.setFont("helvetica", "bold");
    doc.text("VIA DO PACIENTE", 175, footerY, { align: 'right' });

    // Output
    window.open(doc.output('bloburl'), '_blank');
};